from pulumi import get_project, get_stack
from pulumi_policy import (
    EnforcementLevel,
    PolicyPack,
    ResourceValidationPolicy,
)
from taggable import is_taggable 

### Policy to check for required tags on taggable resources and then adds them if they are missing.
def aws_check_required_tags(args):
    if is_taggable(args.resource_type):
        had_violation = False
        if "tags" not in args.props:
            args.props["tags"] = dict()
            had_violation = True
        if "Project" not in args.props["tags"]:
            args.props["tags"]["Project"] = get_project()
            had_violation = True
        if "Stack" not in args.props["tags"]:
            args.props["tags"]["Stack"] = get_stack()
            had_violation = True
        if had_violation:
            return args.props

PolicyPack(
    name="remediate-missing-aws-tags-py",
    enforcement_level=EnforcementLevel.REMEDIATE,
    policies=[
        ResourceValidationPolicy(
            name="remediate_missing_aws_tags",
            description="Ensure required tags are added to taggable AWS resources.",
            remediate=aws_check_required_tags,
        ),
    ],
)