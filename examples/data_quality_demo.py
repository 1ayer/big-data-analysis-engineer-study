"""필수값·중복과 원천 바이트 지문을 확인하는 무의존성 예제."""

from hashlib import sha256


def validate_records(records, required, unique_key):
    missing = [index for index, row in enumerate(records) if any(row.get(key) in (None, "") for key in required)]
    seen = set()
    duplicates = []
    for index, row in enumerate(records):
        value = row.get(unique_key)
        if value in seen:
            duplicates.append(index)
        seen.add(value)
    return {"missing_rows": missing, "duplicate_rows": duplicates}


def source_fingerprint(text):
    return sha256(text.encode("utf-8")).hexdigest()


def demo():
    records = [
        {"event_id": "e-1", "customer_id": "c-10", "amount": 1200},
        {"event_id": "e-2", "customer_id": "", "amount": 800},
        {"event_id": "e-1", "customer_id": "c-11", "amount": 500},
    ]
    result = validate_records(records, required=("event_id", "customer_id", "amount"), unique_key="event_id")
    assert result == {"missing_rows": [1], "duplicate_rows": [2]}
    assert source_fingerprint("원천-v1") == source_fingerprint("원천-v1")
    assert source_fingerprint("원천-v1") != source_fingerprint("원천-v2")
    print("data quality demo: ok")


if __name__ == "__main__":
    demo()
