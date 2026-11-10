import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableProps } from 'antd';

import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';

import { APP_CONFIG } from '../config';
import { getAccessToken, matchesSearch } from '../services';
import { getAllSubCategories } from '../services/subCategories';

const { Text } = Typography;
const { TextArea } = Input;

const API_BASE_URL = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');

// ==================== TYPES ====================

interface AdminStep {
  stepId: string;
  subCategoryId: string;
  stepName: string;
  description: string;
  duration: number;
}

interface AdminSubCategory {
  subCategoryId: string;
  categoryId: string;
  name: string;
  description?: string;
  active?: boolean;
  isActive?: boolean;
}

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

interface StepFormValues {
  subCategoryId: string;
  stepName: string;
  description: string;
  duration: number;
}

// ==================== API STEP ====================

async function requestApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getAccessToken();

  if (!token) {
    throw new Error('Không tìm thấy access token. Vui lòng đăng nhập lại.');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();

  let payload: ApiResponse<T> | null = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.message || text || `Yêu cầu thất bại (${response.status})`,
    );
  }

  return payload ?? { data: undefined };
}

const adminStepApi = {
  getAll: () => requestApi<AdminStep[]>('/api/v1/admin/steps'),

  getBySubCategory: (subCategoryId: string) =>
    requestApi<AdminStep[]>(
      `/api/v1/admin/steps/sub-category/${encodeURIComponent(subCategoryId)}`,
    ),

  create: (values: StepFormValues) =>
    requestApi<AdminStep>('/api/v1/admin/steps', {
      method: 'POST',
      body: JSON.stringify(values),
    }),

  update: (id: string, values: StepFormValues) =>
    requestApi<AdminStep>(`/api/v1/admin/steps/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(values),
    }),

  delete: (id: string) =>
    requestApi<unknown>(`/api/v1/admin/steps/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

// ==================== PAGE ====================

export default function AdminSteps() {
  const [steps, setSteps] = useState<AdminStep[]>([]);
  const [subCategories, setSubCategories] = useState<AdminSubCategory[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<AdminStep | null>(null);

  const [filterSubCategoryId, setFilterSubCategoryId] = useState<
    string | undefined
  >(undefined);
  const [searchText, setSearchText] = useState('');

  const [form] = Form.useForm<StepFormValues>();

  const loadSubCategories = useCallback(async () => {
    setLoadingSubCategories(true);

    try {
      const result = await getAllSubCategories();
      const response = result as unknown;
      let items: AdminSubCategory[] = [];

      if (Array.isArray(response)) {
        items = response as AdminSubCategory[];
      } else if (
        response &&
        typeof response === 'object' &&
        'data' in response &&
        Array.isArray((response as { data?: unknown }).data)
      ) {
        items = (response as { data: AdminSubCategory[] }).data;
      }

      setSubCategories(items);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách danh mục con.',
      );
    } finally {
      setLoadingSubCategories(false);
    }
  }, []);

  const loadSteps = useCallback(async (subCategoryId?: string) => {
    setLoading(true);

    try {
      const result = subCategoryId
        ? await adminStepApi.getBySubCategory(subCategoryId)
        : await adminStepApi.getAll();

      setSteps(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách Step.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubCategories();
    void loadSteps();
  }, [loadSubCategories, loadSteps]);

  const filterSubCategoryOptions = subCategories.map((item) => ({
    value: item.subCategoryId,
    label: item.name,
  }));

  const subCategoryOptions = subCategories
    .filter((item) => (item.isActive ?? item.active) !== false)
    .map((item) => ({
      value: item.subCategoryId,
      label: item.name,
    }));

  const openCreateModal = () => {
    setEditingStep(null);
    form.resetFields();

    form.setFieldsValue({
      subCategoryId: filterSubCategoryId,
      duration: 0,
      stepName: '',
      description: '',
    });

    setModalOpen(true);
  };

  const openEditModal = (step: AdminStep) => {
    setEditingStep(step);

    form.setFieldsValue({
      subCategoryId: step.subCategoryId,
      stepName: step.stepName,
      description: step.description,
      duration: step.duration,
    });

    if (subCategories.length === 0) {
      void loadSubCategories();
    }

    setModalOpen(true);
  };

  const handleSave = async (values: StepFormValues) => {
    setSaving(true);

    try {
      const payload: StepFormValues = {
        subCategoryId: values.subCategoryId,
        stepName: values.stepName.trim(),
        description: values.description?.trim() ?? '',
        duration: Number(values.duration),
      };

      if (editingStep) {
        await adminStepApi.update(editingStep.stepId, payload);
        message.success('Cập nhật Step thành công.');
      } else {
        await adminStepApi.create(payload);
        message.success('Tạo Step thành công.');
      }

      setModalOpen(false);
      setEditingStep(null);
      form.resetFields();

      await Promise.all([
        loadSteps(filterSubCategoryId),
        loadSubCategories(),
      ]);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Không thể lưu Step.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (stepId: string) => {
    try {
      await adminStepApi.delete(stepId);

      message.success('Xóa Step thành công.');
      await Promise.all([
        loadSteps(filterSubCategoryId),
        loadSubCategories(),
      ]);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Không thể xóa Step.',
      );
    }
  };

  const getSubCategoryName = (id: string) => {
    return (
      subCategories.find((item) => item.subCategoryId === id)?.name ?? id
    );
  };

  // ── Tính toán dữ liệu cho Sơ đồ Tiến trình Quy trình (Workflow Pipeline Diagram) ──
  const activeSubCategory = filterSubCategoryId
    ? subCategories.find((s) => s.subCategoryId === filterSubCategoryId)
    : null;

  const pipelineSteps = React.useMemo(() => {
    if (filterSubCategoryId) {
      return steps.filter((s) => s.subCategoryId === filterSubCategoryId);
    }
    const firstSubWithSteps = subCategories.find((sc) =>
      steps.some((s) => s.subCategoryId === sc.subCategoryId),
    );
    if (firstSubWithSteps) {
      return steps.filter((s) => s.subCategoryId === firstSubWithSteps.subCategoryId);
    }
    return steps.slice(0, 6);
  }, [steps, filterSubCategoryId, subCategories]);

  const pipelineSubCategoryName =
    activeSubCategory?.name ||
    (pipelineSteps.length > 0
      ? getSubCategoryName(pipelineSteps[0].subCategoryId)
      : 'Quy trình Tiêu chuẩn');

  const totalSlaHours = pipelineSteps.reduce(
    (acc, cur) => acc + (Number(cur.duration) || 0),
    0,
  );

  const filteredSteps = steps.filter((step) => {
    if (filterSubCategoryId && step.subCategoryId !== filterSubCategoryId) {
      return false;
    }

    const keyword = searchText.trim();
    if (!keyword) return true;

    const subCategoryName = getSubCategoryName(step.subCategoryId);

    return (
      matchesSearch(step.stepId, keyword) ||
      matchesSearch(step.stepName, keyword) ||
      matchesSearch(step.description, keyword) ||
      matchesSearch(subCategoryName, keyword)
    );
  });

  const columns: TableProps<AdminStep>['columns'] = [
    {
      title: 'STT',
      key: 'index',
      width: 65,
      render: (_value, _record, index) => index + 1,
    },
    {
      title: 'Tên bước xử lý',
      dataIndex: 'stepName',
      key: 'stepName',
      render: (value: string) => (
        <Text strong>{value || 'Chưa có tên'}</Text>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (value: string) => value || '—',
    },
    {
      title: 'Danh mục con',
      dataIndex: 'subCategoryId',
      key: 'subCategoryId',
      render: (id: string) => <Text>{getSubCategoryName(id)}</Text>,
    },
    {
      title: 'Thời lượng',
      dataIndex: 'duration',
      key: 'duration',
      width: 120,
      render: (value: number) => (
        <Tag color="orange">{value ?? 0} giờ</Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_value, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Sửa
          </Button>

          <Popconfirm
            title="Xóa Step này?"
            description="Bạn có chắc chắn muốn xóa bước xử lý này?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.stepId)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ==================== RENDER ====================

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto screen-enter">
      {/* Header Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-extrabold text-gray-900 tracking-tight">
            Quản lý Quy trình Xử lý (Steps)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Thiết lập các bước xử lý sự cố và thời lượng thực hiện chuẩn theo từng danh mục con
          </p>
        </div>

        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => {
              void loadSubCategories();
              void loadSteps(filterSubCategoryId);
            }}
          >
            Làm mới
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Thêm Step
          </Button>
        </Space>
      </div>

      {/* Main Content Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
        <Alert
          type="warning"
          showIcon
          message="Quy tắc tính Thời lượng Quy trình"
          description="Thời lượng của mỗi bước được tính bằng đơn vị Giờ (h). Tổng thời lượng của các bước đang hoạt động sẽ được Backend tự động tính cho danh mục con tương ứng."
        />

        <div className="flex flex-wrap items-center gap-3">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Lọc theo danh mục con"
            value={filterSubCategoryId}
            loading={loadingSubCategories}
            options={filterSubCategoryOptions}
            onChange={(value: string | undefined) => {
              setFilterSubCategoryId(value);
              void loadSteps(value);
            }}
            style={{ width: 300, maxWidth: '100%' }}
          />

          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm mã bước, tên bước, mô tả, danh mục con..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ width: 320, maxWidth: '100%' }}
          />

          {(filterSubCategoryId || searchText.trim()) && (
            <Button
              danger
              type="text"
              onClick={() => {
                setFilterSubCategoryId(undefined);
                setSearchText('');
                void loadSteps(undefined);
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {/* =========================================================================
            SƠ ĐỒ TIẾN TRÌNH QUY TRÌNH (WORKFLOW PIPELINE DIAGRAM)
           ========================================================================= */}
        <div className="bg-slate-50/70 border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <h3 className="font-display text-sm font-bold text-gray-900">
                  Sơ đồ Tiến trình Quy trình Xử lý (Workflow Pipeline)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100/70 text-orange-700 border border-orange-200">
                  {pipelineSubCategoryName}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Mô hình hóa chuỗi các bước nghiệp vụ hiện trường và thời lượng SLA cam kết
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold shadow-2xs">
                Số bước: <strong className="text-orange-600">{pipelineSteps.length}</strong> bước
              </span>
              <span className="px-3 py-1 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold shadow-2xs">
                Tổng SLA: <strong className="text-emerald-600">{totalSlaHours}h</strong> (~{(totalSlaHours / 24).toFixed(1)} ngày)
              </span>
            </div>
          </div>

          {/* Flowchart Nodes */}
          {pipelineSteps.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
              Chưa có bước quy trình nào được định nghĩa cho danh mục này. Nhấn <strong>Thêm Step</strong> để khởi tạo bước đầu tiên.
            </div>
          ) : (
            <div className="overflow-x-auto pb-2 scrollbar-thin">
              <div className="flex items-center gap-2 min-w-max py-2">
                {/* Start Node: Tiếp nhận sự cố */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-28 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col items-center text-center">
                    <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center mb-1.5 shadow-2xs">
                      📍
                    </span>
                    <span className="text-[11px] font-bold text-slate-800 leading-tight">
                      Tiếp nhận sự cố
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Điểm khởi tạo</span>
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex items-center text-orange-400 px-1">
                    <svg width="22" height="16" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="0" y1="8" x2="20" y2="8" strokeDasharray="3 2" />
                      <polyline points="14 2 20 8 14 14" />
                    </svg>
                  </div>
                </div>

                {/* Pipeline Step Nodes */}
                {pipelineSteps.map((s, idx) => {
                  return (
                    <React.Fragment key={s.stepId || idx}>
                      <div className="w-48 bg-white border border-gray-200 hover:border-orange-300 hover:shadow-xs rounded-xl p-3.5 shadow-2xs transition-all flex flex-col justify-between group flex-shrink-0">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white font-mono-cf text-[11px] font-black flex items-center justify-center shadow-2xs">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold">
                              ⏱️ {s.duration ?? 0}h
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                            {s.stepName || `Bước #${idx + 1}`}
                          </h4>

                          <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-snug">
                            {s.description || 'Không có mô tả chi tiết'}
                          </p>
                        </div>

                        <div className="flex items-center justify-end gap-1 pt-2.5 mt-2 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                          >
                            Sửa
                          </button>
                        </div>
                      </div>

                      {/* Flow Arrow to next node */}
                      <div className="flex items-center text-orange-400 px-1 flex-shrink-0">
                        <svg width="22" height="16" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="0" y1="8" x2="20" y2="8" strokeDasharray="3 2" />
                          <polyline points="14 2 20 8 14 14" />
                        </svg>
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* Final End Node */}
                <div className="w-28 bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 shadow-2xs flex flex-col items-center text-center flex-shrink-0">
                  <span className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center mb-1.5 shadow-2xs">
                    ✓
                  </span>
                  <span className="text-[11px] font-bold text-emerald-900 leading-tight">
                    Hoàn tất & Đóng
                  </span>
                  <span className="text-[9px] text-emerald-600 mt-0.5">Nghiệm thu sự cố</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <Table<AdminStep>
          rowKey="stepId"
          columns={columns}
          dataSource={filteredSteps}
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} Step`,
          }}
          locale={{
            emptyText: 'Chưa có dữ liệu Step phù hợp.',
          }}
        />
      </div>

      <Modal
        title={editingStep ? 'Cập nhật Step' : 'Tạo Step mới'}
        open={modalOpen}
        onCancel={() => {
          if (saving) return;

          setModalOpen(false);
          setEditingStep(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form<StepFormValues>
          form={form}
          layout="vertical"
          onFinish={handleSave}
          requiredMark="optional"
        >
          <Form.Item
            name="subCategoryId"
            label="Danh mục con"
            rules={[
              {
                required: true,
                message: 'Vui lòng chọn danh mục con.',
              },
            ]}
          >
            <Select
              showSearch
              loading={loadingSubCategories}
              placeholder="Chọn danh mục con"
              optionFilterProp="label"
              options={subCategoryOptions}
              notFoundContent={
                loadingSubCategories
                  ? 'Đang tải danh mục con...'
                  : 'Không tìm thấy danh mục con'
              }
            />
          </Form.Item>

          <Form.Item
            name="stepName"
            label="Tên bước xử lý"
            rules={[
              {
                required: true,
                whitespace: true,
                message: 'Vui lòng nhập tên bước.',
              },
            ]}
          >
            <Input placeholder="Ví dụ: Tiếp nhận phản ánh" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea
              rows={3}
              placeholder="Mô tả nội dung thực hiện bước này"
            />
          </Form.Item>

          <Form.Item
            name="duration"
            label="Thời lượng (giờ)"
            rules={[
              {
                required: true,
                message: 'Vui lòng nhập thời lượng.',
              },
            ]}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: '100%' }}
              addonAfter="giờ"
              placeholder="Nhập thời lượng thực hiện"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
