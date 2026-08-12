"""연관규칙과 거리 계산의 최소 예제."""

from math import dist, isclose


def association_metrics(total, left, right, both):
    if not (total > 0 and 0 < left <= total and 0 < right <= total and 0 <= both <= min(left, right)):
        raise ValueError("빈도 관계를 확인하세요")
    support = both / total
    confidence = both / left
    lift = confidence / (right / total)
    return support, confidence, lift


def nearest_centroid(point, centroids):
    return min(range(len(centroids)), key=lambda index: dist(point, centroids[index]))


def demo():
    support, confidence, lift = association_metrics(100, 20, 40, 12)
    assert isclose(support, 0.12)
    assert isclose(confidence, 0.6)
    assert isclose(lift, 1.5)
    assert association_metrics(100, 20, 40, 0) == (0.0, 0.0, 0.0)
    assert nearest_centroid((1, 1), [(0, 0), (10, 10)]) == 0
    print(f"지지도={support:.2f}, 신뢰도={confidence:.2f}, 향상도={lift:.2f}")


if __name__ == "__main__":
    demo()
