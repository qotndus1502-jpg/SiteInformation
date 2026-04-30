"""Shared business constants used across multiple routers and services.

Anything that's truly local to a single router stays inside that router file.
Constants land here only when at least two modules import them.
"""

# 발주유형 (order types) — kept as a Python set rather than a DB lookup table
# because the values are stable and exhaustive. Used by:
#   - routers/lookup.py    : exposes via /api/lookup/order-types
#                            and strips them out of /api/lookup/facility-types
#   - services/sites_cache : strips them from facility_type_name (dedup)
#   - filter parsers
ORDER_TYPES: set[str] = {"BTL", "CMR", "민간", "민참", "종심제"}

# 그룹 3사 — used in JV share aggregation and corporation rollups.
GROUP_COMPANIES: set[str] = {"남광토건", "극동건설", "금광기업"}
