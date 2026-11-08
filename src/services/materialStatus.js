const labels = {
  uploaded: "تم حفظ الملف فقط",
  analyzing: "قيد التحليل وفق حالة الخادم",
  analyzed: "مسجل كمحلّل في الخادم",
  failed: "فشلت المعالجة"
};

export const materialStatusLabel = (status) => Object.hasOwn(labels, status) ? labels[status] : "حالة المعالجة غير معروفة";
