"""재현 가능한 단순 학습·시험 분할 예제."""

from random import Random


def split_rows(rows, test_ratio=0.25, seed=42):
    if not 0 < test_ratio < 1:
        raise ValueError("test_ratio는 0과 1 사이여야 합니다")
    shuffled = list(rows)
    Random(seed).shuffle(shuffled)
    test_size = max(1, round(len(shuffled) * test_ratio))
    return shuffled[test_size:], shuffled[:test_size]


def demo():
    rows = list(range(12))
    train, test = split_rows(rows)
    train_again, test_again = split_rows(rows)

    assert len(train) == 9 and len(test) == 3
    assert set(train).isdisjoint(test)
    assert sorted(train + test) == rows
    assert (train, test) == (train_again, test_again)
    print(f"학습 {len(train)}개 / 시험 {len(test)}개: 같은 seed로 재현됨")


if __name__ == "__main__":
    demo()
