"""중심·산포·사분위수·두 변수 관계를 확인하는 최소 예제."""

from math import isclose
from statistics import correlation, covariance, mean, median, quantiles, stdev, variance


def summarize(values):
    if len(values) < 2:
        raise ValueError("두 값 이상이 필요합니다")
    q1, _, q3 = quantiles(values, n=4, method="inclusive")
    return {
        "mean": mean(values),
        "median": median(values),
        "variance": variance(values),
        "stdev": stdev(values),
        "iqr": q3 - q1,
    }


def demo():
    x = [1, 2, 3, 4, 5]
    y = [2, 4, 6, 8, 10]
    summary = summarize(x)

    assert summary["mean"] == summary["median"] == 3
    assert isclose(summary["variance"], 2.5)
    assert isclose(summary["stdev"] ** 2, summary["variance"])
    assert isclose(summary["iqr"], 2.0)
    assert isclose(covariance(x, y), 5.0)
    assert isclose(correlation(x, y), 1.0)
    print(f"평균={summary['mean']:.1f}, 표본분산={summary['variance']:.1f}, 상관={correlation(x, y):.1f}")


if __name__ == "__main__":
    demo()
