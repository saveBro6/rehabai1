export type DeliveryAddressForm = {
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  streetAddress: string;
  note: string;
};

export function composeShippingAddress(address: DeliveryAddressForm) {
  const lines = [
    ["Người nhận", address.recipientName.trim()],
    ["Số điện thoại", address.phone.trim()],
    ["Tỉnh/Thành phố", address.province.trim()],
    ["Quận/Huyện", address.district.trim()],
    ["Phường/Xã", address.ward.trim()],
    ["Địa chỉ cụ thể", address.streetAddress.trim()],
    ["Ghi chú", address.note.trim()]
  ];

  return lines
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

function normalizeShippingAddressLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  const hasQuestionMarks = normalized.includes("?");

  if (
    normalized === "người nhận" ||
    normalized === "họ tên người nhận" ||
    (normalized.startsWith("ng") && normalized.includes("nh")) ||
    (hasQuestionMarks && normalized.startsWith("ng"))
  ) {
    return "Người nhận";
  }

  if (
    normalized === "số điện thoại" ||
    (normalized.startsWith("s") && normalized.includes("tho")) ||
    (hasQuestionMarks && normalized.includes("tho"))
  ) {
    return "Số điện thoại";
  }

  if (
    normalized === "tỉnh/thành phố" ||
    normalized === "tỉnh / thành phố" ||
    (normalized.startsWith("t") && normalized.includes("ph")) ||
    (hasQuestionMarks && normalized.startsWith("t") && normalized.includes("ph"))
  ) {
    return "Tỉnh/Thành phố";
  }

  if (
    normalized === "quận/huyện" ||
    normalized === "quận / huyện" ||
    (normalized.startsWith("qu") && normalized.includes("huy")) ||
    (hasQuestionMarks && (normalized.startsWith("qu") || normalized.includes("huy")))
  ) {
    return "Quận/Huyện";
  }

  if (
    normalized === "phường/xã" ||
    normalized === "phường / xã" ||
    (normalized.startsWith("ph") && normalized.includes("x")) ||
    normalized.includes("phuong") ||
    (hasQuestionMarks && normalized.startsWith("ph"))
  ) {
    return "Phường/Xã";
  }

  if (normalized === "ghi chú" || normalized.includes("ghi ch")) {
    return "Ghi chú";
  }

  if (normalized === "địa chỉ cụ thể") {
    return "Địa chỉ cụ thể";
  }

  if (
    normalized === "địa chỉ" ||
    normalized.includes("dia chi") ||
    (hasQuestionMarks && (normalized.startsWith("?") || normalized.includes("dia")))
  ) {
    return normalized.includes("c? th") || normalized.includes("cu the") ? "Địa chỉ cụ thể" : "Địa chỉ";
  }

  return label.trim() || "Địa chỉ";
}

export function getShippingAddressLines(address?: string | null) {
  if (!address?.trim()) {
    return [];
  }

  const lines = address
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  return lines.map((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      return { label: "Địa chỉ", value: line };
    }

    return {
      label: normalizeShippingAddressLabel(line.slice(0, separatorIndex)),
      value: line.slice(separatorIndex + 1).trim()
    };
  });
}
