# shared-github-actions
This folder contains "composite" github action code used by other repos' gihtub actions to manipulate policy-related configuration.

## Component Repos
Each component repo (e.g. [component-random](https://github.com/pulumi-pequod/component-random))has github actions that do the following:
* Publish the component to the `pequod` org's registry.
* Update the configuration for the `platform-team` "check-component-versions" policy to reflect the latest tag for the component.