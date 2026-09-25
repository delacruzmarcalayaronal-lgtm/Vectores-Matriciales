from __future__ import annotations

from pydantic import BaseModel

from .entities import BranchOut, InventoryMovementOut, ProductOut, SaleOut, TargetOut


class TopSellingProductOut(BaseModel):
    product: ProductOut
    quantity: float
    revenue: float


class SalesByBranchOut(BaseModel):
    branch: BranchOut
    revenue: float
    quantity: float


class DashboardStatsOut(BaseModel):
    totalSales: int
    totalRevenue: float
    totalProducts: int
    lowStockProducts: int
    topSellingProducts: list[TopSellingProductOut]
    salesByBranch: list[SalesByBranchOut]
    recentSales: list[SaleOut]
    recentMovements: list[InventoryMovementOut]


class TargetComplianceOut(BaseModel):
    target: TargetOut
    compliance: float


class InventoryRotationOut(BaseModel):
    product: ProductOut
    rotation: float
    daysOfStock: float
