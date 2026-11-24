"""Typed errors so callers can tell "source is down" from "source has no data"."""


class F1DataError(Exception):
    """Base class for all pipeline errors."""


class SourceUnavailable(F1DataError):
    """A source could not be reached or kept failing after retries."""


class SourceFormatError(F1DataError):
    """A source answered, but the payload was not what we expect."""


class PartialData(F1DataError):
    """Requested data is not (fully) available for this race."""
