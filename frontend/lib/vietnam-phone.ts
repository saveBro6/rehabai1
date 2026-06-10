export const VIETNAM_PHONE_ERROR = "Vui lòng nhập số điện thoại Việt Nam hợp lệ.";

export function normalizeVietnamMobilePhone(value: string | null | undefined): string | null {
  const compact = (value || "").trim().replace(/[\s().-]/g, "");
  if (!compact) return null;

  let nationalNumber: string;
  if (/^0\d{9}$/.test(compact)) {
    nationalNumber = compact.slice(1);
  } else if (/^84\d{9}$/.test(compact)) {
    nationalNumber = compact.slice(2);
  } else if (/^\+84\d{9}$/.test(compact)) {
    nationalNumber = compact.slice(3);
  } else {
    return null;
  }

  const mobilePrefixPattern = /^(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-46-9])\d{7}$/;
  if (!mobilePrefixPattern.test(nationalNumber) || /^(\d)\1{8}$/.test(nationalNumber)) {
    return null;
  }

  return `+84${nationalNumber}`;
}
