import { PolicyPack, ResourceValidationPolicy } from "@pulumi/policy";

new PolicyPack("aws-s3-team-tag", {
  policies: [
    {
      name: "aws-s3-requires-team-tag",
      description:
        "Ensures that AWS S3 Bucket resources have a 'team' tag with a value matching the 'team-*' prefix pattern (e.g., team-a, team-b).",
      enforcementLevel: "mandatory",
      validateResource: (args, reportViolation) => {
        // Only validate AWS S3 Bucket resources
        if (args.type !== "aws:s3/bucket:Bucket") {
          return;
        }

        const tags = args.props.tags;

        // Check if tags exist
        if (!tags) {
          reportViolation(
            "AWS S3 Bucket must have a 'team' tag. " +
              "The tag value must follow the pattern 'team-*' (e.g., team-a, team-b, team-platform).",
          );
          return;
        }

        // Check if 'team' tag exists
        if (!("team" in tags)) {
          reportViolation(
            "AWS S3 Bucket must have a 'team' tag. " +
              "The tag value must follow the pattern 'team-*' (e.g., team-a, team-b, team-platform).",
          );
          return;
        }

        const teamTag = tags["team"];

        // Check if team tag value matches the required pattern
        if (typeof teamTag !== "string" || !teamTag.startsWith("team-")) {
          reportViolation(
            `AWS S3 Bucket 'team' tag value must follow the pattern 'team-*' (e.g., team-a, team-b, team-platform). ` +
              `Current value: '${teamTag}'`,
          );
        }
      },
    } as ResourceValidationPolicy,
  ],
});
