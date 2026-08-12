"""혼동행렬의 업무 가치와 집단별 재현율을 확인하는 최소 예제."""

from math import isclose


KEYS = {"tp", "tn", "fp", "fn"}


def confusion_value(counts, values, operating_cost=0):
    if set(counts) != KEYS or set(values) != KEYS or any(count < 0 for count in counts.values()) or operating_cost < 0:
        raise ValueError("네 혼동행렬 항목과 0 이상의 건수·운영비가 필요합니다")
    return sum(counts[key] * values[key] for key in KEYS) - operating_cost


def group_recalls(records):
    if not records:
        raise ValueError("레코드가 하나 이상 필요합니다")
    groups = {}
    for actual, predicted, group in records:
        if actual not in {0, 1} or predicted not in {0, 1}:
            raise ValueError("실제값과 예측값은 0 또는 1이어야 합니다")
        positives, true_positives = groups.get(group, (0, 0))
        groups[group] = (positives + (actual == 1), true_positives + (actual == predicted == 1))
    if any(positives == 0 for positives, _ in groups.values()):
        raise ValueError("모든 집단에 실제 양성이 하나 이상 필요합니다")
    return {group: true_positives / positives for group, (positives, true_positives) in groups.items()}


def demo():
    counts = {"tp": 20, "tn": 100, "fp": 10, "fn": 5}
    values = {"tp": 10, "tn": 0, "fp": -2, "fn": -8}
    records = [(1, 1, "A"), (1, 1, "A"), (1, 0, "B"), (1, 1, "B"), (0, 0, "A")]

    assert confusion_value(counts, values) == 140
    recalls = group_recalls(records)
    assert isclose(recalls["A"], 1.0)
    assert isclose(recalls["B"], 0.5)
    print(f"총가치={confusion_value(counts, values)}, 집단 A/B 재현율={recalls['A']:.1f}/{recalls['B']:.1f}")


if __name__ == "__main__":
    demo()
