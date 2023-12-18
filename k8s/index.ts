import * as k8s from "@pulumi/kubernetes";
import { PolicyPack, validateResourceOfType } from "@pulumi/policy";

// tslint:disable-next-line: no-unused-expression
new PolicyPack("k8s", {
    policies: [
        {
            name: "replica-count",
            description: "Consider more replicas for high-availability.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(k8s.apps.v1.Deployment, (resource, _, reportViolation) => {
                if (resource.spec?.replicas! <= 1) {
                    reportViolation("Replica count should be greater than 1.");
                }
            }),
        },
        {
            name: "non-secure-http",
            description: "External services should expose via HTTPS.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(k8s.core.v1.Service, (resource, _, reportViolation) => {
                resource.spec?.ports?.forEach(specPort => {
                    if (specPort.port !== 443) {
                        reportViolation(`Service port [${specPort.port}] should be exposed via 443.`);
                    }
                });
            }),
        },
        {
            name: "pin-image-versions",
            description: "Images should be pinned to a specific version",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(k8s.apps.v1.Deployment, (resource, _, reportViolation) => {
                resource.spec?.template?.spec?.containers.forEach(it => {
                    if (it?.image?.endsWith(":latest")) {
                        reportViolation("Image version should not be 'latest'.");
                    }
                });
            }),
        },
    ],
});
