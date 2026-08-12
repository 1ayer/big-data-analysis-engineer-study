"""pandas와 scikit-learn으로 실행하는 작은 분류 파이프라인."""

from argparse import ArgumentParser
from pathlib import Path
from tempfile import TemporaryDirectory, gettempdir

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


def load_example_csv(workdir: Path) -> pd.DataFrame:
    """내장 자료를 CSV로 저장했다가 다시 읽어 입력 단계까지 재현한다."""
    bunch = load_breast_cancer(as_frame=True)
    frame = bunch.frame.copy()
    frame["target"] = 1 - frame["target"]  # 악성을 양성(1)으로 둔다.
    frame.loc[frame.index % 37 == 0, "mean area"] = pd.NA  # 결측 처리 연습용.
    source = workdir / "breast_cancer_sample.csv"
    frame.to_csv(source, index=False)
    return pd.read_csv(source)


def add_features(frame: pd.DataFrame) -> pd.DataFrame:
    """행 안의 현재 정보만 써 고정 파생변수를 만든다."""
    result = frame.copy()
    result["radius_per_perimeter"] = result["mean radius"] / result["mean perimeter"]
    result["texture_band"] = pd.cut(
        result["mean texture"],
        bins=[-float("inf"), 15, 25, float("inf")],
        labels=["low", "middle", "high"],
    )
    return result


def build_pipeline(model, numeric_columns, categorical_columns) -> Pipeline:
    numeric = Pipeline([
        ("impute", SimpleImputer(strategy="median")),
        ("scale", StandardScaler()),
    ])
    categorical = Pipeline([
        ("impute", SimpleImputer(strategy="most_frequent")),
        ("one_hot", OneHotEncoder(handle_unknown="ignore")),
    ])
    preprocess = ColumnTransformer([
        ("numeric", numeric, numeric_columns),
        ("categorical", categorical, categorical_columns),
    ])
    return Pipeline([("preprocess", preprocess), ("model", model)])


def run(output: Path) -> dict:
    with TemporaryDirectory() as temporary:
        frame = add_features(load_example_csv(Path(temporary)))

    assert frame["target"].isin([0, 1]).all()
    features = frame.drop(columns="target")
    target = frame["target"]
    train_x, test_x, train_y, test_y = train_test_split(
        features, target, test_size=0.2, stratify=target, random_state=42
    )

    categorical_columns = ["texture_band"]
    numeric_columns = [column for column in train_x.columns if column not in categorical_columns]
    candidates = {
        "logistic": LogisticRegression(max_iter=2000, random_state=42),
        "random_forest": RandomForestClassifier(n_estimators=150, random_state=42, n_jobs=1),
    }
    folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scored = {}
    for name, model in candidates.items():
        pipeline = build_pipeline(model, numeric_columns, categorical_columns)
        scored[name] = (cross_val_score(pipeline, train_x, train_y, cv=folds, scoring="roc_auc").mean(), pipeline)

    selected_name, (cv_auc, selected) = max(scored.items(), key=lambda item: item[1][0])
    selected.fit(train_x, train_y)
    probability = selected.predict_proba(test_x)[:, 1]
    prediction = (probability >= 0.5).astype(int)

    result = pd.DataFrame({
        "row_id": test_x.index,
        "actual_malignant": test_y.to_numpy(),
        "predicted_malignant": prediction,
        "malignant_probability": probability,
    }).sort_values("row_id")
    output.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(output, index=False)

    metrics = {
        "selected": selected_name,
        "cv_auc": cv_auc,
        "test_auc": roc_auc_score(test_y, probability),
        "test_f1": f1_score(test_y, prediction),
        "rows": len(result),
        "output": str(output),
    }
    assert metrics["rows"] == len(test_y) and result["malignant_probability"].between(0, 1).all()
    assert output.exists()
    return metrics


def main() -> None:
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path(gettempdir()) / "practical_predictions.csv")
    args = parser.parse_args()
    metrics = run(args.output)
    print(f"선택 모형: {metrics['selected']}")
    print(f"학습 CV ROC-AUC: {metrics['cv_auc']:.3f}")
    print(f"최종 시험 ROC-AUC: {metrics['test_auc']:.3f}")
    print(f"최종 시험 F1: {metrics['test_f1']:.3f}")
    print(f"예측 {metrics['rows']}건 저장: {metrics['output']}")


if __name__ == "__main__":
    main()
