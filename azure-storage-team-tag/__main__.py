"""Policy pack to enforce that Azure Native storage accounts have a 'team' tag."""

from typing import Callable, Optional

from pulumi_policy import (
    EnforcementLevel,
    PolicyPack,
    ResourceValidationArgs,
    ResourceValidationPolicy,
)

STORAGE_ACCOUNT_TYPE = "azure-native:storage:StorageAccount"

# Type alias for the report_violation callback provided by the policy engine.
ReportViolation = Callable[[str, Optional[str]], None]


def validate_storage_account_team_tag(
    args: ResourceValidationArgs, report_violation: ReportViolation
) -> None:
    """Ensure that Azure Native StorageAccount resources include a 'team' tag."""
    if args.resource_type != STORAGE_ACCOUNT_TYPE:
        return

    tags = args.props.get("tags")

    if not tags or "team" not in tags:
        report_violation(
            "Azure Storage Account must have a 'team' tag. "
            "Please add a 'team' tag to identify the owning team "
            "(e.g., tags: { team: 'platform' }).",
            None,
        )


PolicyPack(
    name="azure-storage-team-tag",
    enforcement_level=EnforcementLevel.MANDATORY,
    policies=[
        ResourceValidationPolicy(
            name="storage-account-requires-team-tag",
            description="Ensures that Azure Native storage accounts have a 'team' tag.",
            validate=validate_storage_account_team_tag,
        ),
    ],
)
