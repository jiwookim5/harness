# Same-Control Hash Check

취약/조치 두 Observation의 `input`, `request`, `criteria`가 문자 그대로 동일했는지
sha256으로 확인한다. 하나라도 다르면 Same-Control로 판정하지 않는다.

| 필드 | 값 (앞 12자) | 취약 Target | 조치 Target | 동일? |
| --- | --- | --- | --- | --- |
| input_sha256 | UNSET | UNSET | UNSET | UNSET |
| request_sha256 | UNSET | UNSET | UNSET | UNSET |
| criteria_sha256 | UNSET | UNSET | UNSET | UNSET |

**판정: UNSET.**

## 결과가 vulnerable.json / patched.json의 근거가 되는 이유

UNSET
