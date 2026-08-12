"""분류 모형의 핵심 계산을 표준 라이브러리로 확인한다."""

from math import exp, isclose, log


def gini(probabilities):
    return 1 - sum(value**2 for value in probabilities)


def entropy(probabilities):
    return -sum(value * log(value, 2) for value in probabilities if value)


def rbf_kernel(left, right, gamma=1.0):
    if len(left) != len(right):
        raise ValueError("두 벡터의 차원이 같아야 합니다")
    squared_distance = sum((a - b) ** 2 for a, b in zip(left, right))
    return exp(-gamma * squared_distance)


def relu(value):
    return max(0.0, value)


def demo():
    assert gini([1.0, 0.0]) == 0.0
    assert isclose(gini([0.5, 0.5]), 0.5)
    assert entropy([1.0, 0.0]) == 0.0
    assert isclose(entropy([0.5, 0.5]), 1.0)
    assert isclose(rbf_kernel([0.0], [0.0]), 1.0)
    assert rbf_kernel([0.0], [2.0]) < rbf_kernel([0.0], [1.0])
    assert relu(-3.0) == 0.0 and relu(3.0) == 3.0
    print("지니·엔트로피·RBF 커널·ReLU 계산 확인")


if __name__ == "__main__":
    demo()
