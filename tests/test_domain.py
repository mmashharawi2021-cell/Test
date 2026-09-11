import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api"))

from domain import can_approve, parse_bbox


def test_approval_rule():
    assert can_approve(has_photo=True, gps_accuracy_m=5) is True
    assert can_approve(has_photo=False, gps_accuracy_m=5) is False
    assert can_approve(has_photo=True, gps_accuracy_m=25) is False
    assert can_approve(has_photo=True, gps_accuracy_m=None) is False


def test_bbox_parser_accepts_valid_4326_bbox():
    bbox = parse_bbox("35.2,31.89,35.24,31.91")
    assert bbox.minx == 35.2
    assert bbox.maxy == 31.91


def test_bbox_parser_rejects_wrong_order():
    try:
        parse_bbox("35.24,31.89,35.2,31.91")
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError")


def test_bbox_parser_rejects_out_of_world_range():
    try:
        parse_bbox("200,31,201,32")
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError")
