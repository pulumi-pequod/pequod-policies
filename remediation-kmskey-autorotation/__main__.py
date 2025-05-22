from pulumi import get_project, get_stack
from pulumi_policy import (
    EnforcementLevel,
    PolicyPack,
    ResourceValidationPolicy,
)

### Policy to check for ecr autoscanning and remediate
def aws_kmskey_autorotation(args):
    if args.resource_type == "aws:kms/key:Key":
        had_violation = False
        if "enableKeyRotation" in args.props:
            if args.props["enableKeyRotation"] != True:
                args.props["enableKeyRotation"] = True
                had_violation = True
        else:
            args.props["enableKeyRotation"] = True
            had_violation = True
        if had_violation:
            return args.props

PolicyPack(
    name="remediate-kmskey-autorotation-py",
    enforcement_level=EnforcementLevel.REMEDIATE,
    policies=[
        ResourceValidationPolicy(
            name="remediate_ecr_autoscan",
            description="Ensure KMS Key has autorotation enabled.",
            remediate=aws_kmskey_autorotation
        ),
    ],
)