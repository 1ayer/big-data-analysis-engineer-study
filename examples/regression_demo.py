"""선형식과 로지스틱 확률의 관계를 확인하는 무의존성 예제."""

from math import exp, isclose, log


def linear_prediction(features, coefficients, intercept=0.0):
    if len(features) != len(coefficients):
        raise ValueError("features와 coefficients의 길이가 같아야 합니다")
    return intercept + sum(x * coefficient for x, coefficient in zip(features, coefficients))


def sigmoid(value):
    if value >= 0:
        return 1 / (1 + exp(-value))
    exp_value = exp(value)
    return exp_value / (1 + exp_value)


def odds(probability):
    if not 0 < probability < 1:
        raise ValueError("probability는 0과 1 사이여야 합니다")
    return probability / (1 - probability)


def demo():
    linear_value = linear_prediction([2.0], [1.0], intercept=-1.0)
    probability = sigmoid(linear_value)

    assert linear_value == 1.0
    assert isclose(probability, 0.7310585786)
    assert isclose(odds(0.8), 4.0)
    assert isclose(log(odds(probability)), linear_value)

    print(f"선형식 출력: {linear_value:.3f}")
    print(f"시그모이드 확률: {probability:.3f}")
    print(f"확률 0.8의 오즈: {odds(0.8):.1f}")


if __name__ == "__main__":
    demo()
