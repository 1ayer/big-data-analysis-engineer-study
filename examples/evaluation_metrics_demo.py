"""이진 분류 혼동행렬과 회귀 지표의 최소 예제."""

from math import isclose, sqrt
from statistics import mean


def confusion_counts(y_true, y_pred):
    if not y_true or len(y_true) != len(y_pred) or not (set(y_true) | set(y_pred)) <= {0, 1}:
        raise ValueError("같은 길이의 비어 있지 않은 이진 레이블이 필요합니다")
    return {
        "tp": sum(actual == predicted == 1 for actual, predicted in zip(y_true, y_pred)),
        "tn": sum(actual == predicted == 0 for actual, predicted in zip(y_true, y_pred)),
        "fp": sum(actual == 0 and predicted == 1 for actual, predicted in zip(y_true, y_pred)),
        "fn": sum(actual == 1 and predicted == 0 for actual, predicted in zip(y_true, y_pred)),
    }


def classification_metrics(counts):
    tp, tn, fp, fn = (counts[key] for key in ("tp", "tn", "fp", "fn"))
    total = tp + tn + fp + fn
    if not total or not (tp + fp) or not (tp + fn) or not (tn + fp):
        raise ValueError("각 지표의 분모가 0이 아니어야 합니다")
    precision = tp / (tp + fp)
    recall = tp / (tp + fn)
    return {
        "accuracy": (tp + tn) / total,
        "precision": precision,
        "recall": recall,
        "specificity": tn / (tn + fp),
        "f1": 2 * precision * recall / (precision + recall),
    }


def regression_metrics(y_true, y_pred):
    if not y_true or len(y_true) != len(y_pred):
        raise ValueError("같은 길이의 비어 있지 않은 값이 필요합니다")
    errors = [actual - predicted for actual, predicted in zip(y_true, y_pred)]
    mae = mean(abs(error) for error in errors)
    mse = mean(error**2 for error in errors)
    baseline = mean(y_true)
    total_squares = sum((value - baseline) ** 2 for value in y_true)
    if total_squares == 0:
        raise ValueError("상수 목표에서는 이 단순 R² 계산을 쓰지 않습니다")
    return {"mae": mae, "mse": mse, "rmse": sqrt(mse), "r2": 1 - sum(error**2 for error in errors) / total_squares}


def demo():
    counts = confusion_counts([1, 1, 1, 0, 0, 0], [1, 1, 0, 1, 0, 0])
    classification = classification_metrics(counts)
    regression = regression_metrics([1, 2, 3, 4], [1, 2, 2, 5])

    assert counts == {"tp": 2, "tn": 2, "fp": 1, "fn": 1}
    assert all(isclose(classification[key], 2 / 3) for key in classification)
    assert isclose(regression["mae"], 0.5)
    assert isclose(regression["mse"], 0.5)
    assert isclose(regression["rmse"], sqrt(0.5))
    assert isclose(regression["r2"], 0.6)
    print(f"정밀도={classification['precision']:.3f}, 재현율={classification['recall']:.3f}, RMSE={regression['rmse']:.3f}")


if __name__ == "__main__":
    demo()
