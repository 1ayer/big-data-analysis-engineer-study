"""이항확률·표준오차·정규근사 신뢰구간의 최소 예제."""

from math import comb, isclose, sqrt


def binomial_pmf(k, n, p):
    if not (isinstance(k, int) and isinstance(n, int) and 0 <= k <= n and 0 <= p <= 1):
        raise ValueError("0 <= k <= n인 정수와 0 <= p <= 1이 필요합니다")
    return comb(n, k) * p**k * (1 - p) ** (n - k)


def mean_standard_error(sample_sd, sample_size):
    if sample_sd < 0 or not isinstance(sample_size, int) or sample_size <= 0:
        raise ValueError("0 이상의 표준편차와 양의 정수 표본 크기가 필요합니다")
    return sample_sd / sqrt(sample_size)


def normal_mean_interval(sample_mean, sample_sd, sample_size, critical=1.96):
    if critical <= 0:
        raise ValueError("임계값은 양수여야 합니다")
    margin = critical * mean_standard_error(sample_sd, sample_size)
    return sample_mean - margin, sample_mean + margin


def demo():
    probabilities = [binomial_pmf(k, 10, 0.3) for k in range(11)]
    lower, upper = normal_mean_interval(50, 10, 100)

    assert isclose(sum(probabilities), 1.0)
    assert isclose(sum(k * probabilities[k] for k in range(11)), 3.0)
    assert mean_standard_error(12, 36) == 2
    assert mean_standard_error(12, 144) == 1
    assert isclose(lower, 48.04) and isclose(upper, 51.96)
    print(f"이항확률 합={sum(probabilities):.1f}, 95% 근사 구간=({lower:.2f}, {upper:.2f})")


if __name__ == "__main__":
    demo()
