from app.core.logging_setup import redact


def test_redacts_credentials():
    text = "connect mongodb+srv://user:pw@cluster/db password=hunter2 Authorization: Bearer abc.def-1"
    out = redact(text)
    assert "hunter2" not in out and "user:pw" not in out and "abc.def-1" not in out
