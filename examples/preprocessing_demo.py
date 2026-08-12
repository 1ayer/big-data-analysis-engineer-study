"""학습 데이터로 결측 대체값·스케일·IQR 경계를 구하는 최소 예제."""

from statistics import mean, median, quantiles, stdev


def fit_median(values):
    observed = [value for value in values if value is not None]
    if not observed:
        raise ValueError("관측값이 하나 이상 필요합니다")
    return median(observed)


def fill_missing(values, fill_value):
    return [fill_value if value is None else value for value in values]


def fit_standardizer(values):
    if len(values) < 2:
        raise ValueError("표준편차에는 두 값 이상이 필요합니다")
    center, scale = mean(values), stdev(values)
    if scale == 0:
        raise ValueError("표준편차가 0이면 표준화할 수 없습니다")
    return center, scale


def transform_standardize(values, center, scale):
    return [(value - center) / scale for value in values]


def iqr_fences(values):
    if len(values) < 2:
        raise ValueError("사분위수에는 두 값 이상이 필요합니다")
    q1, _, q3 = quantiles(values, n=4, method="inclusive")
    iqr = q3 - q1
    return q1 - 1.5 * iqr, q3 + 1.5 * iqr


def demo():
    train = [10.0, None, 12.0, 14.0, 100.0]
    original = train.copy()
    fill_value = fit_median(train)
    filled = fill_missing(train, fill_value)
    center, scale = fit_standardizer(filled)
    standardized = transform_standardize(filled, center, scale)
    lower, upper = iqr_fences(filled)

    assert train == original
    assert fill_value == 13.0
    assert filled == [10.0, 13.0, 12.0, 14.0, 100.0]
    assert abs(mean(standardized)) < 1e-12
    assert abs(stdev(standardized) - 1.0) < 1e-12
    assert 100.0 > upper and 10.0 >= lower
    print(f"대체값={fill_value:.1f}, IQR 경계=({lower:.1f}, {upper:.1f})")


if __name__ == "__main__":
    demo()
