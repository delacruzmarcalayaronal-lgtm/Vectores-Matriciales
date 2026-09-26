from __future__ import annotations

from pydantic import BaseModel

from .branch import BranchOut
from .inventory import InventoryMovementOut
from .product import ProductOut
from .sale import SaleOut
from .target import TargetOut


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
