export interface Ward2025 {
  code: number;
  name: string;
  division_type?: string;
}

export interface Province2025 {
  code: number;
  name: string;
  mergedFrom?: string;
  defaultWards: string[];
}

/**
 * Danh sách 34 Tỉnh / Thành phố của Việt Nam sau sáp nhập đơn vị hành chính (Mô hình 2 cấp: Tỉnh/TP -> Phường/Xã)
 * Kết hợp dữ liệu chuẩn sau sáp nhập và tích hợp API v2 (https://provinces.open-api.vn/api/v2)
 */
export const VN_PROVINCES_2025: Province2025[] = [
  {
    code: 79,
    name: 'TP. Hồ Chí Minh',
    mergedFrom: 'TP.HCM + Bình Dương + Bà Rịa - Vũng Tàu',
    defaultWards: [
      'P. Sài Gòn',
      'P. Tân Định',
      'P. Bến Thành',
      'P. Cầu Ông Lãnh',
      'P. Bàn Cờ',
      'P. Xuân Hòa',
      'P. Nhiêu Lộc',
      'P. Xóm Chiếu',
      'P. Khánh Hội',
      'P. Vĩnh Hội',
      'P. Chợ Quán',
      'P. An Đông',
      'P. Chợ Lớn',
      'P. Bình Tiên',
      'P. Bình Tây',
      'P. Bình Phú',
      'P. Phú Lâm',
      'P. Tân Thuận',
      'P. Phú Thuận',
      'P. Tân Mỹ',
      'P. Tân Hưng',
      'P. Chánh Hưng',
      'P. Phú Định',
      'P. Bình Đông',
      'P. Diên Hồng',
      'P. Vườn Lài',
      'P. Hòa Hưng',
      'P. Minh Phụng',
      'P. Bình Thới',
      'P. Hòa Bình',
      'P. Phú Thọ',
      'P. Đông Hưng Thuận',
      'P. Trung Mỹ Tây',
      'P. Tân Thới Hiệp',
      'P. Thới An',
      'P. An Phú Đông',
      'P. An Lạc',
      'P. Bình Tân',
      'P. Tân Tạo',
      'P. Bình Trị Đông',
      'P. Bình Hưng Hòa',
      'P. Gia Định',
      'P. Bình Thạnh',
      'P. Bình Lợi Trung',
      'P. Thạnh Mỹ Tây',
      'P. Bình Quới',
      'P. Hạnh Thông',
      'P. An Nhơn',
      'P. Gò Vấp',
      'P. Thông Tây Hội',
      'P. An Hội Tây',
      'P. An Hội Đông',
      'P. Đức Nhuận',
      'P. Cầu Kiệu',
      'P. Phú Nhuận',
      'P. Tân Sơn Hòa',
      'P. Tân Sơn Nhất',
      'P. Tân Hòa',
      'P. Bảy Hiền',
      'P. Tân Bình',
      'P. Tân Sơn',
      'P. Tây Thạnh',
      'P. Tân Sơn Nhì',
      'P. Phú Thọ Hòa',
      'P. Phú Thạnh',
      'P. Tân Phú',
      'P. Hiệp Bình',
      'P. Tam Bình',
      'P. Thủ Đức',
      'P. Linh Xuân',
      'P. Long Bình',
      'P. Tăng Nhơn Phú',
      'P. Phước Long',
      'P. Long Phước',
      'P. Long Trường',
      'P. An Khánh',
      'P. Bình Trưng',
      'P. Cát Lái',
      'P. Thủ Dầu Một',
      'P. Phú Lợi',
      'P. Chánh Hiệp',
      'P. Bình Dương',
      'P. Hòa Lợi',
      'P. Thuận An',
      'P. Thuận Giao',
      'P. Bình Hòa',
      'P. Lái Thiêu',
      'P. An Phú',
      'P. Dĩ An',
      'P. Tân Đông Hiệp',
      'P. Đông Hòa',
      'P. Tân Uyên',
      'P. Bến Cát',
      'P. Vũng Tàu',
      'P. Tam Thắng',
      'P. Rạch Dừa',
      'P. Phước Thắng',
      'P. Bà Rịa',
      'P. Long Hương',
      'P. Phú Mỹ',
      'Xã Nhà Bè',
      'Xã Hiệp Phước',
      'Xã Bình Chánh',
      'Xã Vĩnh Lộc',
      'Xã Hóc Môn',
      'Xã Bà Điểm',
      'Xã Củ Chi',
      'Xã Cần Giờ',
      'Đặc khu Côn Đảo',
    ],
  },
  {
    code: 1,
    name: 'TP. Hà Nội',
    mergedFrom: 'Thủ đô Hà Nội (126 phường/xã mới)',
    defaultWards: [
      'P. Hoàn Kiếm',
      'P. Cửa Nam',
      'P. Ba Đình',
      'P. Ngọc Hà',
      'P. Giảng Võ',
      'P. Hai Bà Trưng',
      'P. Vĩnh Tuy',
      'P. Bạch Mai',
      'P. Đống Đa',
      'P. Kim Liên',
      'P. Văn Miếu - Quốc Tử Giám',
      'P. Láng',
      'P. Ô Chợ Dừa',
      'P. Tây Hồ',
      'P. Phú Thượng',
      'P. Hồng Hà',
      'P. Cầu Giấy',
      'P. Nghĩa Đô',
      'P. Yên Hòa',
      'P. Thanh Xuân',
      'P. Khương Đình',
      'P. Phương Liệt',
      'P. Hoàng Mai',
      'P. Vĩnh Hưng',
      'P. Tương Mai',
      'P. Định Công',
      'P. Hoàng Liệt',
      'P. Yên Sở',
      'P. Long Biên',
      'P. Bồ Đề',
      'P. Việt Hưng',
      'P. Phúc Lợi',
      'P. Hà Đông',
      'P. Dương Nội',
      'P. Yên Nghĩa',
      'P. Phú Lương',
      'P. Kiến Hưng',
      'P. Từ Liêm',
      'P. Tây Tựu',
      'P. Phú Diễn',
      'P. Xuân Đỉnh',
      'P. Đông Ngạc',
      'P. Thượng Cát',
      'P. Xuân Phương',
      'P. Tây Mỗ',
      'P. Đại Mỗ',
      'P. Sơn Tây',
      'P. Tùng Thiện',
      'Xã Đông Anh',
      'Xã Gia Lâm',
      'Xã Thanh Trì',
      'Xã Hoài Đức',
      'Xã Đan Phượng',
      'Xã Thạch Thất',
      'Xã Quốc Oai',
      'Xã Chương Mỹ',
      'Xã Thường Tín',
      'Xã Sóc Sơn',
      'Xã Mê Linh',
    ],
  },
  {
    code: 48,
    name: 'TP. Đà Nẵng',
    mergedFrom: 'Đà Nẵng + Quảng Nam',
    defaultWards: [
      'P. Hải Châu',
      'P. Hòa Cường',
      'P. Thanh Khê',
      'P. An Khê',
      'P. Sơn Trà',
      'P. An Hải',
      'P. Ngũ Hành Sơn',
      'P. Liên Chiểu',
      'P. Hòa Khánh',
      'P. Hải Vân',
      'P. Cẩm Lệ',
      'P. Hòa Xuân',
      'P. Tam Kỳ',
      'P. Quảng Phú',
      'P. Hương Trà',
      'P. Bàn Thạch',
      'P. Hội An',
      'P. Hội An Đông',
      'P. Hội An Tây',
      'P. Điện Bàn',
      'P. Điện Bàn Đông',
      'P. Điện Bàn Bắc',
      'Xã Hòa Vang',
      'Xã Hòa Tiến',
      'Xã Bà Nà',
      'Xã Núi Thành',
      'Xã Thăng Bình',
      'Xã Duy Xuyên',
      'Xã Đại Lộc',
      'Đặc khu Hoàng Sa',
    ],
  },
  {
    code: 31,
    name: 'TP. Hải Phòng',
    mergedFrom: 'Hải Phòng + Hải Dương',
    defaultWards: [
      'P. Hồng Bàng',
      'P. Gia Viên',
      'P. Ngô Quyền',
      'P. Lê Chân',
      'P. An Biên',
      'P. Hải An',
      'P. Đông Hải',
      'P. Kiến An',
      'P. Phù Liễn',
      'P. Đồ Sơn',
      'P. Dương Kinh',
      'P. Thủy Nguyên',
      'P. Thiên Hương',
      'P. Hòa Bình',
      'P. An Dương',
      'P. Hải Dương',
      'P. Thành Đông',
      'P. Chí Linh',
      'P. Kinh Môn',
      'Đặc khu Cát Hải',
      'Đặc khu Bạch Long Vĩ',
    ],
  },
  {
    code: 92,
    name: 'TP. Cần Thơ',
    mergedFrom: 'Cần Thơ + Sóc Trăng + Hậu Giang',
    defaultWards: [
      'P. Ninh Kiều',
      'P. Tân An',
      'P. Cái Khế',
      'P. An Bình',
      'P. Bình Thủy',
      'P. Long Tuyền',
      'P. Cái Răng',
      'P. Hưng Phú',
      'P. Ô Môn',
      'P. Thốt Nốt',
      'P. Vị Thanh',
      'P. Ngã Bảy',
      'P. Sóc Trăng',
      'P. Phú Lợi',
      'P. Vĩnh Châu',
      'P. Ngã Năm',
      'Xã Phong Điền',
      'Xã Thới Lai',
      'Xã Cờ Đỏ',
      'Xã Vĩnh Thạnh',
    ],
  },
  {
    code: 46,
    name: 'TP. Huế',
    mergedFrom: 'Thành phố Huế trực thuộc Trung ương',
    defaultWards: [
      'P. Thuận Hóa',
      'P. Phú Xuân',
      'P. Vỹ Dạ',
      'P. Thủy Xuân',
      'P. An Cựu',
      'P. Kim Long',
      'P. Hương An',
      'P. Phú Bài',
      'P. Hương Thủy',
      'P. Hương Trà',
      'P. Phong Điền',
      'Xã Phú Vang',
      'Xã Quảng Điền',
      'Xã Phú Lộc',
      'Xã A Lưới',
    ],
  },
  {
    code: 75,
    name: 'Tỉnh Đồng Nai',
    mergedFrom: 'Đồng Nai + Bình Phước',
    defaultWards: [
      'P. Biên Hòa',
      'P. Trấn Biên',
      'P. Tam Hiệp',
      'P. Long Bình',
      'P. Trảng Dài',
      'P. Hố Nai',
      'P. Long Khánh',
      'P. Đồng Xoài',
      'P. Bình Phước',
      'P. Phước Long',
      'P. Bình Long',
      'P. Chơn Thành',
      'Xã Long Thành',
      'Xã Nhơn Trạch',
      'Xã Trảng Bom',
      'Xã Vĩnh Cửu',
      'Xã Xuân Lộc',
    ],
  },
  {
    code: 72,
    name: 'Tỉnh Tây Ninh',
    mergedFrom: 'Tây Ninh + Long An',
    defaultWards: [
      'P. Tân Ninh',
      'P. Hòa Thành',
      'P. Trảng Bàng',
      'P. Gò Dầu',
      'P. Long An',
      'P. Tân An',
      'P. Kiến Tường',
      'Xã Bến Lức',
      'Xã Đức Hòa',
      'Xã Cần Giuộc',
      'Xã Cần Đước',
      'Xã Dương Minh Châu',
      'Xã Tân Biên',
    ],
  },
  {
    code: 86,
    name: 'Tỉnh Vĩnh Long',
    mergedFrom: 'Vĩnh Long + Bến Tre + Trà Vinh',
    defaultWards: [
      'P. Long Châu',
      'P. Phước Hậu',
      'P. Tân Hạnh',
      'P. Bình Minh',
      'P. Bến Tre',
      'P. Phú Khương',
      'P. Trà Vinh',
      'P. Nguyệt Hóa',
      'P. Duyên Hải',
      'Xã Long Hồ',
      'Xã Mang Thít',
      'Xã Chợ Lách',
      'Xã Châu Thành',
    ],
  },
  {
    code: 87,
    name: 'Tỉnh Đồng Tháp',
    mergedFrom: 'Đồng Tháp + Tiền Giang',
    defaultWards: [
      'P. Cao Lãnh',
      'P. Mỹ Trà',
      'P. Sa Đéc',
      'P. Hồng Ngự',
      'P. Mỹ Tho',
      'P. Đạo Thạnh',
      'P. Gò Công',
      'P. Cai Lậy',
      'Xã Lấp Vò',
      'Xã Lai Vung',
      'Xã Châu Thành',
      'Xã Chợ Gạo',
      'Xã Cái Bè',
    ],
  },
  {
    code: 89,
    name: 'Tỉnh An Giang',
    mergedFrom: 'An Giang + Kiên Giang',
    defaultWards: [
      'P. Long Xuyên',
      'P. Mỹ Thới',
      'P. Châu Đốc',
      'P. Tân Châu',
      'P. Rạch Giá',
      'P. Vĩnh Thanh',
      'P. Hà Tiên',
      'Đặc khu Phú Quốc',
      'Đặc khu Kiên Hải',
      'Đặc khu Thổ Châu',
      'Xã Chợ Mới',
      'Xã Thoại Sơn',
      'Xã Hòn Đất',
    ],
  },
  {
    code: 96,
    name: 'Tỉnh Cà Mau',
    mergedFrom: 'Cà Mau + Bạc Liêu',
    defaultWards: [
      'P. Tân Thành',
      'P. An Xuyên',
      'P. Lý Văn Lâm',
      'P. Hòa Thành',
      'P. Bạc Liêu',
      'P. Vĩnh Trạch',
      'P. Giá Rai',
      'Xã Năm Căn',
      'Xã Ngọc Hiển',
      'Xã Trần Văn Thời',
      'Xã Đầm Dơi',
    ],
  },
  {
    code: 56,
    name: 'Tỉnh Khánh Hòa',
    mergedFrom: 'Khánh Hòa + Ninh Thuận',
    defaultWards: [
      'P. Nha Trang',
      'P. Bắc Nha Trang',
      'P. Nam Nha Trang',
      'P. Tây Nha Trang',
      'P. Cam Ranh',
      'P. Cam Linh',
      'P. Ninh Hòa',
      'P. Phan Rang',
      'P. Đông Hải',
      'Xã Diên Khánh',
      'Xã Vạn Ninh',
      'Xã Cam Lâm',
      'Đặc khu Trường Sa',
    ],
  },
  {
    code: 68,
    name: 'Tỉnh Lâm Đồng',
    mergedFrom: 'Lâm Đồng + Bình Thuận + Đắk Nông',
    defaultWards: [
      'P. Xuân Hương - Đà Lạt',
      'P. Cam Ly - Đà Lạt',
      'P. Lâm Viên - Đà Lạt',
      'P. Xuân Trường - Đà Lạt',
      'P. Lang Biang - Đà Lạt',
      'P. Bảo Lộc',
      'P. Phan Thiết',
      'P. Mũi Né',
      'P. Phú Thủy',
      'P. La Gi',
      'P. Gia Nghĩa',
      'Xã Đức Trọng',
      'Xã Di Linh',
      'Đặc khu Phú Quý',
    ],
  },
  {
    code: 66,
    name: 'Tỉnh Đắk Lắk',
    mergedFrom: 'Đắk Lắk + Phú Yên',
    defaultWards: [
      'P. Buôn Ma Thuột',
      'P. Tân An',
      'P. Tân Lập',
      'P. Thành Nhất',
      'P. Ea Kao',
      'P. Buôn Hồ',
      'P. Tuy Hòa',
      'P. Phú Yên',
      'P. Sông Cầu',
      'P. Đông Hòa',
      'Xã Cư M’gar',
      'Xã Krông Pắc',
      'Xã Ea H’leo',
    ],
  },
  {
    code: 64,
    name: 'Tỉnh Gia Lai',
    mergedFrom: 'Gia Lai + Bình Định',
    defaultWards: [
      'P. Pleiku',
      'P. Hội Phú',
      'P. Thống Nhất',
      'P. Diên Hồng',
      'P. An Khê',
      'P. Ayun Pa',
      'P. Quy Nhơn',
      'P. Quy Nhơn Nam',
      'P. Quy Nhơn Bắc',
      'P. An Nhơn',
      'P. Hoài Nhơn',
      'Xã Chư Sê',
      'Xã Đak Đoa',
      'Xã Tuy Phước',
    ],
  },
  {
    code: 51,
    name: 'Tỉnh Quảng Ngãi',
    mergedFrom: 'Quảng Ngãi + Kon Tum',
    defaultWards: [
      'P. Cẩm Thành',
      'P. Nghĩa Lộ',
      'P. Trương Quang Trọng',
      'P. Đức Phổ',
      'P. Kon Tum',
      'P. Đăk Cấm',
      'Xã Bình Sơn',
      'Xã Sơn Tịnh',
      'Xã Mộ Đức',
      'Xã Ngọc Hồi',
      'Đặc khu Lý Sơn',
    ],
  },
  {
    code: 45,
    name: 'Tỉnh Quảng Trị',
    mergedFrom: 'Quảng Trị + Quảng Bình',
    defaultWards: [
      'P. Đông Hà',
      'P. Nam Đông Hà',
      'P. Quảng Trị',
      'P. Đồng Hới',
      'P. Đồng Thuận',
      'P. Đồng Sơn',
      'P. Ba Đồn',
      'Xã Vĩnh Linh',
      'Xã Gio Linh',
      'Xã Hướng Hóa',
      'Xã Lệ Thủy',
      'Xã Bố Trạch',
      'Đặc khu Cồn Cỏ',
    ],
  },
  {
    code: 40,
    name: 'Tỉnh Nghệ An',
    defaultWards: [
      'P. Trường Vinh',
      'P. Thành Vinh',
      'P. Vinh Hưng',
      'P. Vinh Phú',
      'P. Vinh Lộc',
      'P. Cửa Lò',
      'P. Hoàng Mai',
      'P. Thái Hòa',
      'Xã Hưng Nguyên',
      'Xã Nghi Lộc',
      'Xã Diễn Châu',
      'Xã Quỳnh Lưu',
      'Xã Đô Lương',
    ],
  },
  {
    code: 42,
    name: 'Tỉnh Hà Tĩnh',
    defaultWards: [
      'P. Thành Sen',
      'P. Trần Phú',
      'P. Hà Huy Tập',
      'P. Hồng Lĩnh',
      'P. Kỳ Anh',
      'P. Sông Trí',
      'Xã Thạch Hà',
      'Xã Cẩm Xuyên',
      'Xã Can Lộc',
      'Xã Nghi Xuân',
      'Xã Hương Sơn',
    ],
  },
  {
    code: 38,
    name: 'Tỉnh Thanh Hóa',
    defaultWards: [
      'P. Hạc Thành',
      'P. Quảng Phú',
      'P. Đông Quang',
      'P. Đông Sơn',
      'P. Hàm Rồng',
      'P. Sầm Sơn',
      'P. Bỉm Sơn',
      'P. Nghi Sơn',
      'Xã Hoằng Hóa',
      'Xã Quảng Xương',
      'Xã Triệu Sơn',
      'Xã Thọ Xuân',
    ],
  },
  {
    code: 37,
    name: 'Tỉnh Ninh Bình',
    mergedFrom: 'Ninh Bình + Nam Định + Hà Nam',
    defaultWards: [
      'P. Hoa Lư',
      'P. Nam Hoa Lư',
      'P. Tây Hoa Lư',
      'P. Tam Điệp',
      'P. Nam Định',
      'P. Thiên Trường',
      'P. Đông A',
      'P. Phủ Lý',
      'P. Hà Nam',
      'P. Duy Tiên',
      'Xã Gia Viễn',
      'Xã Yên Khánh',
      'Xã Hải Hậu',
    ],
  },
  {
    code: 33,
    name: 'Tỉnh Hưng Yên',
    mergedFrom: 'Hưng Yên + Thái Bình',
    defaultWards: [
      'P. Phố Hiến',
      'P. Sơn Nam',
      'P. Hồng Châu',
      'P. Mỹ Hào',
      'P. Thái Bình',
      'P. Trần Lãm',
      'P. Trần Hưng Đạo',
      'Xã Văn Giang',
      'Xã Yên Mỹ',
      'Xã Văn Lâm',
      'Xã Khoái Châu',
      'Xã Đông Hưng',
      'Xã Tiền Hải',
    ],
  },
  {
    code: 27,
    name: 'Tỉnh Bắc Ninh',
    mergedFrom: 'Bắc Ninh + Bắc Giang',
    defaultWards: [
      'P. Kinh Bắc',
      'P. Võ Cường',
      'P. Vũ Ninh',
      'P. Hạp Lĩnh',
      'P. Từ Sơn',
      'P. Quế Võ',
      'P. Thuận Thành',
      'P. Bắc Giang',
      'P. Đa Mai',
      'P. Việt Yên',
      'P. Chũ',
      'Xã Yên Phong',
      'Xã Tiên Du',
      'Xã Hiệp Hòa',
    ],
  },
  {
    code: 22,
    name: 'Tỉnh Quảng Ninh',
    defaultWards: [
      'P. Hạ Long',
      'P. Hồng Gai',
      'P. Bãi Cháy',
      'P. Hà Tu',
      'P. Cao Xanh',
      'P. Cẩm Phả',
      'P. Uông Bí',
      'P. Móng Cái',
      'P. Đông Triều',
      'P. Quảng Yên',
      'Đặc khu Vân Đồn',
      'Đặc khu Cô Tô',
    ],
  },
  {
    code: 19,
    name: 'Tỉnh Thái Nguyên',
    mergedFrom: 'Thái Nguyên + Bắc Kạn',
    defaultWards: [
      'P. Phan Đình Phùng',
      'P. Gia Sàng',
      'P. Tích Lương',
      'P. Quán Triều',
      'P. Phổ Yên',
      'P. Sông Công',
      'P. Bắc Kạn',
      'P. Đức Xuân',
      'Xã Đại Từ',
      'Xã Phú Bình',
      'Xã Định Hóa',
    ],
  },
  {
    code: 25,
    name: 'Tỉnh Phú Thọ',
    mergedFrom: 'Phú Thọ + Vĩnh Phúc + Hòa Bình',
    defaultWards: [
      'P. Việt Trì',
      'P. Nông Trang',
      'P. Thanh Miếu',
      'P. Phú Thọ',
      'P. Vĩnh Yên',
      'P. Vĩnh Phúc',
      'P. Phúc Yên',
      'P. Hòa Bình',
      'P. Kỳ Sơn',
      'Xã Lâm Thao',
      'Xã Phù Ninh',
      'Xã Tam Đảo',
      'Xã Lương Sơn',
    ],
  },
  {
    code: 10,
    name: 'Tỉnh Lào Cai',
    mergedFrom: 'Lào Cai + Yên Bái',
    defaultWards: [
      'P. Lào Cai',
      'P. Cam Đường',
      'P. Sa Pa',
      'P. Yên Bái',
      'P. Âu Cơ',
      'P. Nghĩa Lộ',
      'Xã Bảo Thắng',
      'Xã Bát Xát',
      'Xã Văn Yên',
      'Xã Lục Yên',
    ],
  },
  {
    code: 8,
    name: 'Tỉnh Tuyên Quang',
    mergedFrom: 'Tuyên Quang + Hà Giang',
    defaultWards: [
      'P. Minh Xuân',
      'P. Mỹ Lâm',
      'P. An Tường',
      'P. Hà Giang 1',
      'P. Hà Giang 2',
      'Xã Sơn Dương',
      'Xã Yên Sơn',
      'Xã Chiêm Hóa',
      'Xã Vị Xuyên',
      'Xã Đồng Văn',
    ],
  },
  {
    code: 4,
    name: 'Tỉnh Cao Bằng',
    defaultWards: [
      'P. Thục Phán',
      'P. Nùng Trí Cao',
      'P. Tân Giang',
      'Xã Hòa An',
      'Xã Quảng Hòa',
      'Xã Trùng Khánh',
      'Xã Bảo Lạc',
      'Xã Nguyên Bình',
    ],
  },
  {
    code: 20,
    name: 'Tỉnh Lạng Sơn',
    defaultWards: [
      'P. Đông Kinh',
      'P. Lương Văn Tri',
      'P. Tam Thanh',
      'P. Kỳ Lừa',
      'Xã Cao Lộc',
      'Xã Hữu Lũng',
      'Xã Chi Lăng',
      'Xã Lộc Bình',
    ],
  },
  {
    code: 14,
    name: 'Tỉnh Sơn La',
    defaultWards: [
      'P. Tô Hiệu',
      'P. Chiềng An',
      'P. Chiềng Cơi',
      'P. Chiềng Sinh',
      'P. Mộc Châu',
      'P. Mộc Sơn',
      'Xã Mai Sơn',
      'Xã Thuận Châu',
      'Xã Yên Châu',
    ],
  },
  {
    code: 11,
    name: 'Tỉnh Điện Biên',
    defaultWards: [
      'P. Điện Biên Phủ',
      'P. Mường Thanh',
      'P. Mường Lay',
      'Xã Điện Biên',
      'Xã Tuần Giáo',
      'Xã Mường Ảng',
      'Xã Tủa Chùa',
    ],
  },
  {
    code: 12,
    name: 'Tỉnh Lai Châu',
    defaultWards: [
      'P. Tân Phong',
      'P. Đoàn Kết',
      'Xã Tam Đường',
      'Xã Phong Thổ',
      'Xã Than Uyên',
      'Xã Tân Uyên',
      'Xã Sìn Hồ',
    ],
  },
];

const wardCacheByProvinceCode: Record<number, string[]> = {};

/**
 * Lấy danh sách Phường/Xã sau sáp nhập của một Tỉnh/Thành phố.
 * Kết hợp dữ liệu trực tuyến từ API v2 (provinces.open-api.vn/api/v2/p/{code}?depth=2)
 * và bộ dữ liệu chuẩn tích hợp sẵn để luôn hiển thị tức thì và đầy đủ.
 */
export async function getWardsForProvince2025(province: Province2025): Promise<string[]> {
  if (wardCacheByProvinceCode[province.code]) {
    return wardCacheByProvinceCode[province.code];
  }

  try {
    const res = await fetch(`https://provinces.open-api.vn/api/v2/p/${province.code}?depth=2`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.wards) && data.wards.length > 0) {
        const apiWards: string[] = data.wards
          .map((w: any) => formatWardName(String(w?.name || '').trim()))
          .filter(Boolean);
        // Gộp danh sách từ API v2 và danh sách mặc định (loại bỏ trùng lặp)
        const defaultWardsFormatted = province.defaultWards.map(formatWardName);
        const merged = Array.from(new Set([...defaultWardsFormatted, ...apiWards]));
        wardCacheByProvinceCode[province.code] = merged;
        return merged;
      }
    }
  } catch {
    // Fallback an toàn về danh sách tích hợp sẵn khi offline
  }

  const defaultFormatted = province.defaultWards.map(formatWardName);
  wardCacheByProvinceCode[province.code] = defaultFormatted;
  return defaultFormatted;
}

/**
 * Chuẩn hóa tên Phường: Luôn bắt đầu bằng "P. " nếu là phường
 * Ví dụ: "Phường Sài Gòn" -> "P. Sài Gòn", "Phường 1" -> "P. 1"
 */
export function formatWardName(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();
  if (!str) return '';
  if (/^(phường|Phường|PHƯỜNG)\s+/i.test(str)) {
    return str.replace(/^(phường|Phường|PHƯỜNG)\s+/i, 'P. ');
  }
  if (/^P(?:\.|\b)\s*/i.test(str)) {
    return str.replace(/^P(?:\.|\b)\s*/i, 'P. ');
  }
  return str;
}

/**
 * Chuẩn hóa tên Tỉnh / Thành phố: Các thành phố trực thuộc trung ương luôn có tiền tố "TP. "
 * Ví dụ: "Thành phố Hồ Chí Minh" -> "TP. Hồ Chí Minh", "Hồ Chí Minh" -> "TP. Hồ Chí Minh"
 */
export function formatProvinceName(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();
  if (!str) return '';

  const clean = removeVietnameseTones(str);

  if (
    clean.includes('ho chi minh') ||
    clean.includes('saigon') ||
    clean.includes('sai gon') ||
    clean.includes('hcm')
  ) {
    return 'TP. Hồ Chí Minh';
  }
  if (clean.includes('ha noi') || clean.includes('hanoi')) {
    return 'TP. Hà Nội';
  }
  if (clean.includes('da nang') || clean.includes('danang')) {
    return 'TP. Đà Nẵng';
  }
  if (clean.includes('hai phong') || clean.includes('haiphong')) {
    return 'TP. Hải Phòng';
  }
  if (clean.includes('can tho') || clean.includes('cantho')) {
    return 'TP. Cần Thơ';
  }
  if (clean.includes('hue') || clean.includes('thua thien')) {
    return 'TP. Huế';
  }

  if (/^(thành\s+phố|Thành\s+phố|Thành\s+Phố|THÀNH\s+PHỐ)\s+/i.test(str)) {
    return str.replace(/^(thành\s+phố|Thành\s+phố|Thành\s+Phố|THÀNH\s+PHỐ)\s+/i, 'TP. ');
  }
  if (/^TP(?:\.|\b)\s*/i.test(str)) {
    return str.replace(/^TP(?:\.|\b)\s*/i, 'TP. ');
  }

  const CITIES = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Huế'];
  for (const c of CITIES) {
    if (
      str.toLowerCase() === c.toLowerCase() ||
      str.toLowerCase() === `tp ${c.toLowerCase()}` ||
      str.toLowerCase() === `tp. ${c.toLowerCase()}`
    ) {
      return `TP. ${c}`;
    }
  }
  return str;
}

/**
 * Phát hiện Tỉnh / Thành phố thông minh từ tọa độ GPS và thông tin reverse geocode
 */
export function detectProvinceFromCoords(
  latitude?: number,
  longitude?: number,
  addr?: any
): string {
  // 1. Kiểm tra các trường văn bản từ geocode
  if (addr) {
    const textToCheck = [
      addr.city,
      addr.region,
      addr.subregion,
      addr.district,
      addr.street,
      addr.name,
    ]
      .filter(Boolean)
      .join(' ');
    const fromName = formatProvinceName(textToCheck);
    if (fromName && fromName.startsWith('TP.')) {
      return fromName;
    }
  }

  // 2. Dựa vào tọa độ địa lý (Bounding box tại Việt Nam)
  if (latitude !== undefined && longitude !== undefined) {
    if (latitude >= 10.1 && latitude <= 11.6 && longitude >= 106.1 && longitude <= 107.5) {
      return 'TP. Hồ Chí Minh';
    }
    if (latitude >= 20.5 && latitude <= 21.6 && longitude >= 105.3 && longitude <= 106.2) {
      return 'TP. Hà Nội';
    }
    if (latitude >= 15.8 && latitude <= 16.3 && longitude >= 107.9 && longitude <= 108.5) {
      return 'TP. Đà Nẵng';
    }
    if (latitude >= 16.0 && latitude <= 16.8 && longitude >= 107.0 && longitude <= 108.0) {
      return 'TP. Huế';
    }
    if (latitude >= 9.8 && latitude <= 10.4 && longitude >= 105.3 && longitude <= 106.0) {
      return 'TP. Cần Thơ';
    }
    if (latitude >= 20.5 && latitude <= 21.1 && longitude >= 106.4 && longitude <= 107.2) {
      return 'TP. Hải Phòng';
    }

    if (latitude >= 8.5 && latitude <= 12.0) {
      return 'TP. Hồ Chí Minh';
    }
  }

  return 'TP. Hồ Chí Minh';
}

/**
 * Chuẩn hóa toàn bộ địa chỉ theo đúng chuẩn hành chính Việt Nam:
 * - Phường -> "P." (P. Bến Thành, P. 1)
 * - Thành phố -> "TP." (TP. Hồ Chí Minh, TP. Hà Nội)
 */
export function formatStandardAddress(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();
  if (!str) return '';

  // 1. Chuẩn hóa Phường: "Phường", "phường", "PHƯỜNG" hoặc "P " (thiếu dấu chấm) -> "P."
  str = str.replace(/\b(Phường|phường|PHƯỜNG)\s+/g, 'P. ');
  str = str.replace(/\bP(?:\.|\b)\s*([0-9A-ZÀ-Ỹ])/g, 'P. $1');

  // 2. Chuẩn hóa Thành phố: "Thành phố", "thành phố", "Thành Phố", "THÀNH PHỐ" -> "TP."
  str = str.replace(/\b(Thành\s+phố|thành\s+phố|Thành\s+Phố|THÀNH\s+PHỐ)\s+/g, 'TP. ');
  str = str.replace(/\bTP(?:\.|\b)\s*([A-ZÀ-Ỹ])/g, 'TP. $1');

  // 3. Chuẩn hóa các thành phố trực thuộc trung ương phổ biến nếu thiếu tiền tố "TP."
  const CITIES = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Huế'];
  for (const c of CITIES) {
    const regex = new RegExp(`(^|,\\s*)(?!TP\\.\\s*)(${c})(?=\\s*(,|$))`, 'g');
    str = str.replace(regex, '$1TP. $2');
  }

  return str.replace(/\s+/g, ' ').trim();
}

export function removeVietnameseTones(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function findProvince2025ByName(rawName?: string | null): Province2025 | undefined {
  if (!rawName || !rawName.trim()) return undefined;
  const cleaned = removeVietnameseTones(rawName.trim())
    .replace(/^(tinh|thanh pho|tp\.?|tp)\s+/i, '')
    .trim();
  if (!cleaned) return undefined;

  return (
    VN_PROVINCES_2025.find((p) => {
      const pClean = removeVietnameseTones(p.name)
        .replace(/^(tinh|thanh pho|tp\.?|tp)\s+/i, '')
        .trim();
      return (
        pClean === cleaned ||
        removeVietnameseTones(p.name) === removeVietnameseTones(rawName.trim())
      );
    }) ||
    VN_PROVINCES_2025.find((p) => {
      const pClean = removeVietnameseTones(p.name)
        .replace(/^(tinh|thanh pho|tp\.?|tp)\s+/i, '')
        .trim();
      return pClean.includes(cleaned) || cleaned.includes(pClean);
    })
  );
}


