
import requests
import json


def get_policy_groups(base_api_url, headers):
    """
    Get the list of policy groups from the Pulumi API.
    
    Args:
        base_api_url: The base API URL for policy groups
        headers: HTTP headers including authentication
        
    Returns:
        List of policy group names
    """
    response = requests.get(base_api_url, headers=headers)
    response.raise_for_status()
    policy_groups = []
    for policy_group in response.json().get("policyGroups", []):
      ### TEMPORARY: Skip default policy group
      if policy_group.get("name") == "default-policy-group":
        continue

      if policy_group.get("numEnabledPolicyPacks", 0) > 0:
        # Only include policy groups that have enabled policy packs
        policy_groups.append(policy_group["name"])
    print(f"policy groups: {policy_groups}")
    return policy_groups


def get_component_version(component_type, component_types, component_version):
    """
    Check if component_type is in the list of component types to update.
    If yes, return the version to set, otherwise return None.
    
    Args:
        component_type: The component type to check (e.g., "random-abstracted:index:PetAbstracted")
        component_types: List of component types that should be updated
        component_version: The version to apply to matching component types
        
    Returns:
        component_version if component_type is in component_types, None otherwise
    """
    if component_type in component_types:
        return component_version
    return None