import math

import pytest
from f1data.normalize import clean, to_bool, to_float, to_int
from f1data.sources.tracinginsights import parse_laps


@pytest.mark.parametrize("value", [None, "None", "nan", "", "  ", float("nan"), float("inf")])
def test_clean_turns_missing_into_none(value):
    assert clean(value) is None


def test_numeric_conversion_never_raises_or_returns_nan():
    assert to_int("3.0") == 3 and to_int("x") is None and to_int(True) is None
    assert to_float("1.5") == 1.5 and to_float("nan") is None
    assert not math.isnan(to_float("2") or 0)
    assert to_bool("True") is True and to_bool("None") is None


def test_parse_laps_handles_upstream_none_strings():
    payload = {
        "lap": [1, 2, 3], "time": [90.1, "None", 88.0], "compound": ["SOFT", "soft", "UNKNOWN"],
        "stint": [1, 1, "None"], "life": [4, 5, 6], "status": ["1", "12", "1"],
        "pin": ["None", "None", 1234.5], "pout": ["None", 99.0, "None"], "del": [False, False, False],
        "wR": [False, False, True],
    }
    laps = parse_laps(payload)
    assert [x.time_s for x in laps] == [90.1, None, 88.0]
    assert [x.compound for x in laps] == ["SOFT", "SOFT", None]  # UNKNOWN becomes None, not a fake value
    assert laps[2].stint is None and laps[2].pit_in is True and laps[1].pit_out is True


def test_parse_laps_rejects_payload_without_laps():
    from f1data.errors import SourceFormatError

    with pytest.raises(SourceFormatError):
        parse_laps({"time": [1.0]})
