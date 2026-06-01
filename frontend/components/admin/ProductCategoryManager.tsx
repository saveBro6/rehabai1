"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useToast } from "@/hooks/useToast";
import {
  createProductCategory,
  deleteProductCategory,
  getAdminProductCategoryRows,
  getProductCategoryUsage,
  setProductCategoryActive,
  updateProductCategory
} from "@/services/product-categories.service";
import type { ProductCategory } from "@/types";

function categoryKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

function formatDate(value?: string | null) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function ProductCategoryManager() {
  const { pushToast } = useToast();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const activeCount = useMemo(() => categories.filter((category) => category.is_active).length, [categories]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [categoryRows, categoryUsage] = await Promise.all([getAdminProductCategoryRows(), getProductCategoryUsage()]);
      setCategories(categoryRows);
      setUsage(categoryUsage);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh mục sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setError("Vui lòng nhập tên danh mục.");
      return;
    }

    setSavingId("new");
    setError("");
    try {
      const category = await createProductCategory({ name });
      pushToast("Thêm danh mục thành công.", category.name);
      setNewCategoryName("");
      await loadCategories();
    } catch (addError) {
      const message = addError instanceof Error ? addError.message : "Không thể thêm danh mục.";
      setError(message);
      pushToast("Không thể thêm danh mục.", message);
    } finally {
      setSavingId(null);
    }
  }

  function startEdit(category: ProductCategory) {
    setEditingId(category.id);
    setEditingName(category.name);
    setError("");
  }

  async function saveEdit(category: ProductCategory) {
    const name = editingName.trim();
    if (!name) {
      setError("Vui lòng nhập tên danh mục.");
      return;
    }

    setSavingId(category.id);
    setError("");
    try {
      const updated = await updateProductCategory(category.id, {
        name,
        is_active: category.is_active,
        sort_order: category.sort_order
      });
      pushToast("Cập nhật danh mục thành công.", updated.name);
      setEditingId(null);
      setEditingName("");
      await loadCategories();
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Không thể cập nhật danh mục.";
      setError(message);
      pushToast("Không thể cập nhật danh mục.", message);
    } finally {
      setSavingId(null);
    }
  }

  async function toggleCategory(category: ProductCategory) {
    setSavingId(category.id);
    setError("");
    try {
      const updated = await setProductCategoryActive(category.id, !category.is_active);
      pushToast(
        updated.is_active ? "Danh mục đã được dùng lại." : "Danh mục đã ngừng dùng.",
        updated.name
      );
      await loadCategories();
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : "Không thể cập nhật trạng thái danh mục.";
      setError(message);
      pushToast("Không thể cập nhật danh mục.", message);
    } finally {
      setSavingId(null);
    }
  }

  async function removeCategory(category: ProductCategory) {
    setSavingId(category.id);
    setError("");
    try {
      await deleteProductCategory(category.id);
      pushToast("Xóa danh mục thành công.", category.name);
      await loadCategories();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Không thể xóa danh mục.";
      setError(message);
      pushToast("Không thể xóa danh mục.", message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card className="mt-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-emerald-700">Danh mục sản phẩm</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">Quản lý danh mục</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Danh mục được lưu trong bảng lookup riêng và vẫn ghi vào trường text `products.category` khi tạo hoặc sửa sản phẩm.
            Danh mục đang ngừng dùng không xuất hiện trong bộ lọc công khai.
          </p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {activeCount}/{categories.length} danh mục đang dùng
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto]">
        <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="new-product-category">
          Thêm danh mục mới
          <input
            id="new-product-category"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="Ví dụ: Dụng cụ thăng bằng"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void addCategory();
              }
            }}
          />
        </label>
        <Button className="self-end" disabled={savingId === "new"} type="button" onClick={() => void addCategory()}>
          {savingId === "new" ? "Đang thêm..." : "Thêm danh mục"}
        </Button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Tên danh mục</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Sản phẩm</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-4 py-3 font-semibold">Cập nhật</th>
              <th className="px-4 py-3 font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-5 text-slate-500" colSpan={6}>
                  Đang tải danh mục...
                </td>
              </tr>
            ) : categories.length ? (
              categories.map((category) => {
                const productCount = usage[categoryKey(category.name)] || 0;
                const isSaving = savingId === category.id;
                const isEditing = editingId === category.id;

                return (
                  <tr key={category.id}>
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <input
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                        />
                      ) : (
                        <span className="font-semibold text-slate-950">{category.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-500">{category.slug}</td>
                    <td className="px-4 py-4 text-slate-700">{productCount}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          category.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {category.is_active ? "Đang dùng" : "Ngừng dùng"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(category.updated_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <Button disabled={isSaving} type="button" onClick={() => void saveEdit(category)}>
                              Lưu
                            </Button>
                            <Button
                              disabled={isSaving}
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setEditingName("");
                              }}
                            >
                              Hủy
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button disabled={isSaving} type="button" variant="secondary" onClick={() => startEdit(category)}>
                              Sửa
                            </Button>
                            <Button disabled={isSaving} type="button" variant="secondary" onClick={() => void toggleCategory(category)}>
                              {category.is_active ? "Ngừng dùng" : "Dùng lại"}
                            </Button>
                            <Button disabled={isSaving || productCount > 0} type="button" variant="ghost" onClick={() => void removeCategory(category)}>
                              Xóa
                            </Button>
                          </>
                        )}
                      </div>
                      {productCount > 0 ? (
                        <p className="mt-2 text-xs text-slate-500">Không xóa danh mục đang có sản phẩm.</p>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-5 text-slate-500" colSpan={6}>
                  Chưa có danh mục sản phẩm.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
