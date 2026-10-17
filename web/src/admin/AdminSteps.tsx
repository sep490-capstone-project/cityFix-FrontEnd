import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
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

import { getAccessToken } from '../services';
import { getAllSubCategories  } from '../services/subCategories';

const { Title, Text } = Typography;
const { TextArea } = Input;

const API_BASE_URL = 'https://cityfix-backend-80ar.onrender.com';

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
    throw new Error(
      'Không tìm thấy access token. Vui lòng đăng nhập lại.',
    );
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
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
      payload?.message ||
        text ||
        `Yêu cầu thất bại (${response.status})`,
    );
  }

  return payload ?? { data: undefined };
}

const adminStepApi = {
  getAll: () =>
    requestApi<AdminStep[]>('/api/v1/admin/steps'),

  getBySubCategory: (subCategoryId: string) =>
    requestApi<AdminStep[]>(
      `/api/v1/admin/steps/sub-category/${encodeURIComponent(
        subCategoryId,
      )}`,
    ),

  create: (values: StepFormValues) =>
    requestApi<AdminStep>('/api/v1/admin/steps', {
      method: 'POST',
      body: JSON.stringify(values),
    }),

  update: (id: string, values: StepFormValues) =>
    requestApi<AdminStep>(
      `/api/v1/admin/steps/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(values),
      },
    ),

  delete: (id: string) =>
    requestApi<unknown>(
      `/api/v1/admin/steps/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),
};

// ==================== PAGE ====================

export default function AdminSteps() {
  const [steps, setSteps] = useState<AdminStep[]>([]);
  const [subCategories, setSubCategories] = useState<
    AdminSubCategory[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [loadingSubCategories, setLoadingSubCategories] =
    useState(false);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStep, setEditingStep] =
    useState<AdminStep | null>(null);

  const [filterSubCategoryId, setFilterSubCategoryId] =
    useState<string | undefined>(undefined);
  const [searchText, setSearchText] = useState('');

  const [form] = Form.useForm<StepFormValues>();

  // Lấy danh sách SubCategory bằng service có sẵn
  const loadSubCategories = useCallback(async () => {
    setLoadingSubCategories(true);

    try {
      const result = await getAllSubCategories();

      // Service có thể trả về mảng trực tiếp hoặc response có data.
      const response = result as unknown;

      let items: AdminSubCategory[] = [];

      if (Array.isArray(response)) {
        items = response as AdminSubCategory[];
      } else if (
        response &&
        typeof response === 'object' &&
        'data' in response &&
        Array.isArray(
          (response as { data?: unknown }).data,
        )
      ) {
        items = (response as {
          data: AdminSubCategory[];
        }).data;
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

  // Lấy danh sách Step
  const loadSteps = useCallback(
    async (subCategoryId?: string) => {
      setLoading(true);

      try {
        const result = subCategoryId
          ? await adminStepApi.getBySubCategory(subCategoryId)
          : await adminStepApi.getAll();

        setSteps(
          Array.isArray(result.data) ? result.data : [],
        );
      } catch (error) {
        message.error(
          error instanceof Error
            ? error.message
            : 'Không thể tải danh sách Step.',
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadSubCategories();
    void loadSteps();
  }, [loadSubCategories, loadSteps]);

  // Options dùng chung cho bộ lọc và form
  const subCategoryOptions = subCategories
    .filter((item) => item.active !== false)
    .map((item) => ({
      value: item.subCategoryId,
      label: item.name,
    }));

  // Mở form tạo Step
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

  // Mở form sửa Step
  const openEditModal = (step: AdminStep) => {
    setEditingStep(step);

    form.setFieldsValue({
      subCategoryId: step.subCategoryId,
      stepName: step.stepName,
      description: step.description,
      duration: step.duration,
    });

    // Đảm bảo danh sách lựa chọn được tải khi mở form sửa.
    if (subCategories.length === 0) {
      void loadSubCategories();
    }

    setModalOpen(true);
  };

  // Lưu Step
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
        await adminStepApi.update(
          editingStep.stepId,
          payload,
        );

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
        error instanceof Error
          ? error.message
          : 'Không thể lưu Step.',
      );
    } finally {
      setSaving(false);
    }
  };

  // Xóa Step
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
        error instanceof Error
          ? error.message
          : 'Không thể xóa Step.',
      );
    }
  };

  // Tìm tên SubCategory để hiển thị trên bảng
  const getSubCategoryName = (id: string) => {
    return (
      subCategories.find(
        (item) => item.subCategoryId === id,
      )?.name ?? id
    );
  };

  // Tìm kiếm theo tên bước, mô tả hoặc tên danh mục con
  const filteredSteps = steps.filter((step) => {
    const keyword = searchText.trim().toLowerCase();

    const subCategoryName = getSubCategoryName(
      step.subCategoryId,
    ).toLowerCase();

    return (
      !keyword ||
      step.stepName?.toLowerCase().includes(keyword) ||
      step.description?.toLowerCase().includes(keyword) ||
      subCategoryName.includes(keyword)
    );
  });

  // Cột bảng
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
      render: (id: string) => (
        <Text>{getSubCategoryName(id)}</Text>
      ),
    },
    {
      title: 'Thời lượng',
      dataIndex: 'duration',
      key: 'duration',
      width: 120,
      render: (value: number) => (
        <Tag color="blue">{value ?? 0} giờ</Tag>
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
            <Button
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ==================== RENDER ====================

  return (
    <div className="p-6">
      <Card>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Title level={3} style={{ marginBottom: 6 }}>
              Quản lý quy trình xử lý
            </Title>

            <Text type="secondary">
              Quản lý các bước xử lý sự cố theo danh mục con
              của CityFix.
            </Text>
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

        <Alert
          type="info"
          showIcon
          message="Thời lượng quy trình xử lý"
          description="Thời lượng của mỗi bước được tính bằng đơn vị Giờ (h). Tổng thời lượng của các bước active sẽ được Backend tự động tính thành SLA cho danh mục con tương ứng."
          style={{ marginBottom: 20 }}
        />

        <div className="mb-4 flex flex-wrap gap-3">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Lọc theo danh mục con"
            value={filterSubCategoryId}
            loading={loadingSubCategories}
            options={subCategoryOptions}
            onChange={(value: string | undefined) => {
              setFilterSubCategoryId(value);
              void loadSteps(value);
            }}
            style={{ width: 300, maxWidth: '100%' }}
          />

          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm tên bước, mô tả..."
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
            style={{ width: 280, maxWidth: '100%' }}
          />
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
            emptyText: 'Chưa có dữ liệu Step.',
          }}
        />
      </Card>

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

          <Form.Item
            name="description"
            label="Mô tả"
          >
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
              placeholder="Nhập số giờ (VD: 24)"
              addonAfter="giờ"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}