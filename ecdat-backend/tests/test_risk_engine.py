"""
Phase 7 unit tests: Mosca's inequality boundary conditions (Phase 4.1).

Pure-function tests against calculate_mosca_risk / is_weak_key_size — no DB,
no async, matching IMPLEMENTATION_PLAN.md §7.2's test_risk_engine.py spec.
compute_asset_risk itself (the DB-touching half) is exercised by
ecdat-backend/test_phase6_audit.py against the real database instead.
"""
import pytest

from app.services.risk_engine import calculate_mosca_risk, is_weak_key_size


def test_mosca_critical_when_xy_exceeds_z():
    # X(10) + Y(5) = 15 > Z(12) -> harvest-now-decrypt-later window is open
    result = calculate_mosca_risk(data_lifetime_years=10, migration_time_years=5, threat_horizon_years=12)
    assert result["level"] == "CRITICAL"
    assert result["total_xy"] == 15
    assert result["margin"] == -3


def test_mosca_low_with_large_margin():
    # X(2) + Y(1) = 3, Z(12) -> 9y margin, well beyond the 6y LOW threshold
    result = calculate_mosca_risk(data_lifetime_years=2, migration_time_years=1, threat_horizon_years=12)
    assert result["level"] == "LOW"
    assert result["margin"] == 9


def test_mosca_boundary_exactly_at_threshold_is_high_not_critical():
    # X + Y == Z exactly: Mosca's inequality (the CRITICAL condition) is a
    # strict X+Y > Z, so landing exactly on Z falls into the margin<=2y HIGH
    # bucket instead — worth a boundary test precisely because it's easy to
    # get the >= vs > comparison backwards here.
    result = calculate_mosca_risk(data_lifetime_years=7, migration_time_years=5, threat_horizon_years=12)
    assert result["total_xy"] == 12
    assert result["margin"] == 0
    assert result["level"] == "HIGH"


def test_mosca_boundary_one_year_over_is_critical():
    result = calculate_mosca_risk(data_lifetime_years=7, migration_time_years=6, threat_horizon_years=12)
    assert result["total_xy"] == 13
    assert result["level"] == "CRITICAL"


def test_mosca_boundary_margin_exactly_two_is_high():
    # margin == 2 -> HIGH (threshold is "<= 2")
    result = calculate_mosca_risk(data_lifetime_years=5, migration_time_years=5, threat_horizon_years=12)
    assert result["margin"] == 2
    assert result["level"] == "HIGH"


def test_mosca_boundary_margin_just_above_two_is_medium():
    # margin == 2.1 -> MEDIUM
    result = calculate_mosca_risk(data_lifetime_years=5, migration_time_years=4.9, threat_horizon_years=12)
    assert round(result["margin"], 1) == 2.1
    assert result["level"] == "MEDIUM"


def test_mosca_boundary_margin_exactly_six_is_medium():
    result = calculate_mosca_risk(data_lifetime_years=3, migration_time_years=3, threat_horizon_years=12)
    assert result["margin"] == 6
    assert result["level"] == "MEDIUM"


def test_mosca_boundary_margin_just_above_six_is_low():
    result = calculate_mosca_risk(data_lifetime_years=3, migration_time_years=2.9, threat_horizon_years=12)
    assert round(result["margin"], 1) == 6.1
    assert result["level"] == "LOW"


def test_mosca_zero_lifetime_and_migration():
    # Degenerate case: data that's already public / migration already done.
    result = calculate_mosca_risk(data_lifetime_years=0, migration_time_years=0, threat_horizon_years=12)
    assert result["level"] == "LOW"
    assert result["margin"] == 12


def test_mosca_z_field_reflects_input():
    # Regression check for the Phase 0-6 audit fix: Z must be whatever was
    # actually passed in (the caller's resolved workspace threat_horizon_years),
    # never silently a hardcoded constant.
    result = calculate_mosca_risk(data_lifetime_years=1, migration_time_years=1, threat_horizon_years=3.0)
    assert result["z_threat_horizon"] == 3.0


# is_weak_key_size — classical security thresholds
@pytest.mark.parametrize("family,key_size,expected", [
    ("RSA", 1024, True),
    ("RSA", 2047, True),
    ("RSA", 2048, False),
    ("RSA", 4096, False),
    ("ECDSA", 160, True),
    ("ECDSA", 224, False),
    ("ECDSA", 256, False),
    ("DSA", 1024, True),
    ("DSA", 2048, False),
])
def test_is_weak_key_size(family, key_size, expected):
    assert is_weak_key_size(family, key_size) == expected


def test_is_weak_key_size_none_is_not_weak():
    # No key size info at all shouldn't be asserted as "weak" — that would be
    # a false claim, not an honest "unknown".
    assert is_weak_key_size("RSA", None) is False


def test_is_weak_key_size_unknown_family_not_weak():
    assert is_weak_key_size("AES", 128) is False  # no classical key-size threshold defined for AES
