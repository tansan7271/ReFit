"""
공유 rate limiter 인스턴스.

main.py와 각 라우터가 동일한 Limiter를 import 하도록 별도 모듈로 분리한다
(라우터가 main.py를 import 하면 순환 참조 발생).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# IP 기반 rate limit
limiter = Limiter(key_func=get_remote_address)
