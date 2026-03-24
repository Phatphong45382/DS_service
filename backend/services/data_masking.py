"""
Data Masking Service
====================
Maps real product/customer names to anonymous names before sending to frontend.
Supports reverse mapping for predict API (frontend -> Dataiku needs real names).

Usage:
    from ..services.data_masking import masker

    masked_name = masker.mask("flavor", "Orange-Mandarin")
    real_name   = masker.unmask("flavor", "Original")
"""

import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


# ─── Static Mapping Tables ───────────────────────────────────────
# Keys = real values from Dataiku (ORIGINAL casing preserved)
# Values = anonymous display names
# Lookup is always case-insensitive.

_FLAVOR_MAP = {
    "Orange-Mandarin": "Original",
    "Orange": "BBQ",
    "Apple": "Seaweed",
    "Grape": "Cheese",
    "Coconut": "Sour Cream",
    "Pineapple": "Hot Spicy",
    "Mango": "Wasabi",
    "Lychee": "Tom Yum",
    "Guava": "Salted Egg",
    "Mixed Fruit": "Truffle",
    "Passion Fruit": "Honey Butter",
    "Rambutan": "Teriyaki",
}

_PRODUCT_GROUP_MAP = {
    "Fruit Juice": "Chips",
    "Coconut Water": "Crackers",
    "Beverage": "Rice Crackers",
    "Canned Fruit": "Canned Fruit",
}

_CUSTOMER_MAP = {
    "7 - Eleven": "FreshMart",
    "7-Eleven": "FreshMart",
    "Lotus": "MegaStore",
    "Big C": "ValuePlus",
    "Tops": "CityGrocery",
    "CP ALL": "RetailCo",
}

_SITE_MAP = {
    "SITE-01": "DC Central 1",
    "SITE-02": "DC Central 2",
    "SITE-03": "DC East 1",
    "SITE-04": "DC South 1",
    "SITE-05": "DC Central 3",
    "SITE-06": "DC North 1",
    "SITE-07": "DC South 2",
    "SITE-08": "DC North-East 1",
    "SITE-09": "DC West 1",
}

_SIZE_MAP = {
    "200 ml": "30g",
    "350 ml": "75g",
    "1000 ml": "150g",
    "20 oz": "50g",
    "8.25 oz": "20g",
}

_MECHGROUP_MAP = {
    "7Days": "Weekly Deal",
    "Corporate": "B2B Program",
    "No_Promotion": "No Promotion",
    "Stamp": "Loyalty Points",
}

# ─── Build case-insensitive index ────────────────────────────────
# _CI_MAPS[field][lowercase_real] = (original_real, masked)

_RAW_MAPS: Dict[str, Dict[str, str]] = {
    "flavor": _FLAVOR_MAP,
    "product_group": _PRODUCT_GROUP_MAP,
    "customer": _CUSTOMER_MAP,
    "site": _SITE_MAP,
    "size": _SIZE_MAP,
    "mechgroup": _MECHGROUP_MAP,
}

_CI_MAPS: Dict[str, Dict[str, tuple]] = {}       # field -> {lower_real: (original_real, masked)}
_CI_REVERSE: Dict[str, Dict[str, str]] = {}       # field -> {lower_masked: original_real}

for _field, _mapping in _RAW_MAPS.items():
    _CI_MAPS[_field] = {}
    _CI_REVERSE[_field] = {}
    for _real, _masked in _mapping.items():
        _CI_MAPS[_field][_real.lower()] = (_real, _masked)
        _CI_REVERSE[_field][_masked.lower()] = _real

# Auto-generated names for values not in static maps
_AUTO_COUNTERS: Dict[str, int] = {}
_AUTO_FORWARD: Dict[str, Dict[str, tuple]] = {}   # field -> {lower_real: (original_real, masked)}
_AUTO_REVERSE: Dict[str, Dict[str, str]] = {}     # field -> {lower_masked: original_real}

_AUTO_PREFIXES = {
    "flavor": "Flavor",
    "product_group": "Category",
    "customer": "Customer",
    "site": "Site",
    "size": "Size",
    "mechgroup": "Promo Type",
}


class DataMasker:
    """Bidirectional data masking for demo purposes."""

    def mask(self, field: str, real_value: str) -> str:
        """Map a real value to its anonymous display name."""
        if not real_value or not field:
            return real_value

        field = field.lower()
        real_stripped = real_value.strip()
        real_lower = real_stripped.lower()

        # 1. Static map (case-insensitive)
        ci = _CI_MAPS.get(field, {})
        if real_lower in ci:
            return ci[real_lower][1]  # return masked name

        # 1b. Prefix match for sites ("SITE-01 (สมุทรปราการ)" -> match "site-01")
        if field == "site":
            for key, (orig, masked) in ci.items():
                if real_lower.startswith(key):
                    return masked

        # 2. Already auto-generated
        if field in _AUTO_FORWARD and real_lower in _AUTO_FORWARD[field]:
            return _AUTO_FORWARD[field][real_lower][1]

        # 3. Auto-generate
        prefix = _AUTO_PREFIXES.get(field, field.title())
        _AUTO_COUNTERS[field] = _AUTO_COUNTERS.get(field, 0) + 1
        masked = f"{prefix} {_AUTO_COUNTERS[field]:02d}"

        if field not in _AUTO_FORWARD:
            _AUTO_FORWARD[field] = {}
            _AUTO_REVERSE[field] = {}

        _AUTO_FORWARD[field][real_lower] = (real_stripped, masked)
        _AUTO_REVERSE[field][masked.lower()] = real_stripped

        logger.info(f"Auto-mask [{field}]: '{real_stripped}' -> '{masked}'")
        return masked

    def unmask(self, field: str, masked_value: str) -> str:
        """Reverse map: anonymous name -> real value (original casing)."""
        if not masked_value or not field:
            return masked_value

        field = field.lower()
        masked_lower = masked_value.strip().lower()

        # 1. Static reverse (case-insensitive)
        rev = _CI_REVERSE.get(field, {})
        if masked_lower in rev:
            return rev[masked_lower]

        # 2. Auto-generated reverse
        if field in _AUTO_REVERSE and masked_lower in _AUTO_REVERSE[field]:
            return _AUTO_REVERSE[field][masked_lower]

        # 3. Not found — return as-is
        logger.warning(f"Unmask [{field}]: '{masked_value}' not found, returning as-is")
        return masked_value

    def match(self, field: str, row_value: str, filter_value: str) -> bool:
        """Case-insensitive comparison: does a row value match the unmasked filter?"""
        if not row_value or not filter_value:
            return False
        return row_value.strip().lower() == filter_value.strip().lower()

    def match_in(self, field: str, row_value: str, filter_list: list) -> bool:
        """Case-insensitive 'in' check for multi-select filters."""
        if not row_value or not filter_list:
            return False
        rv = row_value.strip().lower()
        return any(rv == f.strip().lower() for f in filter_list)


# Singleton
masker = DataMasker()
