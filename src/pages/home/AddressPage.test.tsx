import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
const addressesQueryFn = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/features/auth/store/auth-store", () => ({
  useAuthStore: (selector: (state: { user: { patientId: string } | null }) => unknown) =>
    selector({ user: { patientId: "patient-mock-001" } }),
}));

vi.mock("@/features/patient/api/queries", () => ({
  patientQueries: {
    addresses: () => ({
      queryKey: ["patient", "addresses", "patient-mock-001"],
      queryFn: addressesQueryFn,
    }),
  },
  patientMutations: {
    deleteAddress: () => ({ mutationFn: vi.fn() }),
    setDefaultAddress: () => ({ mutationFn: vi.fn() }),
    createAddress: () => ({ mutationFn: vi.fn() }),
    updateAddress: () => ({ mutationFn: vi.fn() }),
  },
  patientQueryKeys: {
    addresses: () => ["patient", "addresses", "patient-mock-001"],
  },
}));

import AddressPage from "@/pages/home/AddressPage";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWith(ui: ReactNode) {
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
  return queryClient;
}

describe("AddressPage", () => {
  beforeEach(() => {
    navigate.mockReset();
    addressesQueryFn.mockReset();
  });

  it("renders loading state when data is loading", () => {
    // Never-resolving promise keeps query in loading state
    addressesQueryFn.mockReturnValue(new Promise(() => {}));
    renderWith(<AddressPage />);
    // Look for the spinner (animate-spin class)
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders error state with retry button", async () => {
    addressesQueryFn.mockRejectedValue(new Error("网络错误"));
    renderWith(<AddressPage />);
    await waitFor(() => {
      expect(screen.getByText("地址加载失败")).toBeInTheDocument();
    });
    expect(screen.getByText("重试")).toBeInTheDocument();
  });

  it("renders empty state when no addresses", async () => {
    addressesQueryFn.mockResolvedValue({ addresses: [] });
    renderWith(<AddressPage />);
    await waitFor(() => {
      expect(screen.getByText("暂无收货地址")).toBeInTheDocument();
    });
  });

  it("renders address list when data is available", async () => {
    addressesQueryFn.mockResolvedValue({
      addresses: [
        {
          id: "addr-1",
          patientId: "patient-mock-001",
          name: "张三",
          phone: "13800001111",
          province: "辽宁省",
          city: "沈阳市",
          district: "浑南区",
          detail: "软件园B4座",
          isDefault: true,
          tag: "公司",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    });
    renderWith(<AddressPage />);
    await waitFor(() => {
      expect(screen.getByText("张三")).toBeInTheDocument();
    });
  });

  it("renders the add button", async () => {
    addressesQueryFn.mockResolvedValue({ addresses: [] });
    renderWith(<AddressPage />);
    await waitFor(() => {
      expect(screen.getByText("添加")).toBeInTheDocument();
    });
  });

  it("back button navigates to /profile", async () => {
    addressesQueryFn.mockResolvedValue({ addresses: [] });
    renderWith(<AddressPage />);
    await waitFor(() => {
      expect(screen.getByText("暂无收货地址")).toBeInTheDocument();
    });
    // The back button has aria-label
    const backButton = screen.getByLabelText("返回个人中心");
    backButton.click();
    expect(navigate).toHaveBeenCalledWith("/profile");
  });
});
