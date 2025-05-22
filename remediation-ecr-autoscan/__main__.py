from pulumi import get_project, get_stack
from pulumi_policy import (
    EnforcementLevel,
    PolicyPack,
    ResourceValidationPolicy,
)

### Policy to check for ecr autoscanning and remediate
def aws_ecr_autoscan(args):
    if args.resource_type == "aws:ecr/repository:Repository":
        had_violation = False
        if "imageScanningConfiguration" in args.props:
            if args.props["imageScanningConfiguration"]["scanOnPush"] != True:
                args.props["imageScanningConfiguration"]["scanOnPush"] = True
                had_violation = True
        else:
            args.props["imageScanningConfiguration"] = dict()
            args.props["imageScanningConfiguration"]["scanOnPush"] = True
            had_violation = True
        if had_violation:
            return args.props

PolicyPack(
    name="remediate-ecr-autoscan-py",
    enforcement_level=EnforcementLevel.REMEDIATE,
    policies=[
        ResourceValidationPolicy(
            name="remediate_ecr_autoscan",
            description="Ensure ECR has scan-on-push enabled.",
            remediate=aws_ecr_autoscan
        ),
    ],
)