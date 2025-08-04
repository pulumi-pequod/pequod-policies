import requests
import json
import os
import sys
from policy_config_helpers import get_policy_groups, get_component_version

def update_policy_config():
    # Get environment variables passed in from the workflow
    api_endpoint = os.environ.get('PULUMI_API_ENDPOINT') or 'https://api.pulumi.com'
    auth_token = os.environ.get('PULUMI_ACCESS_TOKEN')  # The access token is set by the OIDC Issuer that is invoked in the github action
    if not auth_token:
        print("Error: PULUMI_ACCESS_TOKEN environment variable is required")
        sys.exit(1)
    component_policy_pack_name = os.environ.get('POLICY_PACK')  # The name of the policy pack to update
    if not component_policy_pack_name:
        print("Error: POLICY_PACK environment variable is required")
        sys.exit(1)
    component_version = os.environ.get('COMPONENT_VERSION')
    org = os.environ.get('PULUMI_ORG') 
    if not org:
        print("Error: PULUMI_ORG environment variable is required")
        sys.exit(1)
    
    # Parse COMPONENT_TYPES JSON string into a list
    component_types_str = os.environ.get('COMPONENT_TYPES')
    try:
        component_types = json.loads(component_types_str) if component_types_str else []
        if not isinstance(component_types, list):
            print("Error: COMPONENT_TYPES must be a JSON array")
            sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error parsing COMPONENT_TYPES JSON: {e}")
        print(f"COMPONENT_TYPES value: {component_types_str}")
        sys.exit(1)

    # Print the variables passed in to the script
    print("environment variables:")
    print(f"API_ENDPOINT: {api_endpoint}")
    print(f"ORG: {org}")
    print(f"COMPONENT_TYPES: {component_types}")
    print(f"COMPONENT_VERSION: {component_version}")

    # Construct the API URL
    base_api_url = f"{api_endpoint}/api/orgs/{org}/policygroups"
    
    # Set up headers
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': f'token {auth_token}'
    }
    
    # Get the list of policy groups that may need to be updated
    policy_groups = get_policy_groups(base_api_url, headers)

    # Loop through each policy group
    for policy_group in policy_groups:
        print("**************")
        print(f"Processing policy group: {policy_group}")
        api_url = f"{base_api_url}/{policy_group}"
    
        try:
            # GET request to retrieve policy group config
            response = requests.get(api_url, headers=headers)
            response.raise_for_status()
            
            # Parse the JSON response
            policy_data = response.json()
            # print(f"Retrieved policy data: {json.dumps(policy_data, indent=2)}")

            # Now using the result from the GET request
            # Modify the policy data - update the component version to reflect:
            # - new component type version if it exists
            # - add new component type and version if it doesn't exist
            updated = False
            if 'appliedPolicyPacks' in policy_data and policy_data['appliedPolicyPacks']:
                # Process all policy packs in this policy group
                for policy_pack in policy_data['appliedPolicyPacks']:
                    # Look to see if this policy group uses the specified policy pack
                    if 'name' in policy_pack and policy_pack['name'] == component_policy_pack_name:
                        print(f"{policy_group} uses policy pack, {policy_pack['name']}")

                        if 'config' in policy_pack and 'check-component-versions' in policy_pack['config']:
                            allowed_versions = policy_pack['config']['check-component-versions']['allowedComponentVersions']

                            # Keep track of which components we've found and updated
                            found_components = set()

                            # Find and update existing component versions
                            for component in allowed_versions:
                                if 'type' in component and 'version' in component:
                                    component_type = component['type']
                                    # print(f"Checking component: {component_type}")
                                    
                                    # Check if this component type needs to be updated
                                    new_version = get_component_version(component_type, component_types, component_version)
                                    if new_version:
                                        found_components.add(component_type)
                                        old_version = component['version']
                                        component['version'] = new_version  # Update to new version
                                        print(f"Updated component type, {component_type} version from {old_version} to {new_version}")
                                        updated = True
                                    # else:
                                        # print(f"No update needed for {component_type}")
                                else:
                                    print(f"Component missing type or version: {component}")
                            
                            # Add new components that weren't found in the existing policy
                            for component_type in component_types:
                                if component_type not in found_components:
                                    new_component = {
                                        "type": component_type,
                                        "version": component_version
                                    }
                                    allowed_versions.append(new_component)
                                    print(f"Added new component: {component_type} with version {component_version}")
                                    updated = True
                        
                        if updated:
                            # Prepare PATCH request body in the required format
                            patch_body = {
                                "addPolicyPack": {
                                    "name": policy_pack['name'],
                                    "displayName": policy_pack['displayName'],
                                    "versionTag": policy_pack['versionTag'],
                                    "config": policy_pack['config']
                                }
                            }
                            
                            # PATCH request to update the policy
                            print(f"Updating policy group at: {api_url}")
                            
                            patch_response = requests.patch(
                                api_url, 
                                headers=headers,
                                json=patch_body
                            )
                            patch_response.raise_for_status()
                            
                            print("Policy update successful!")
                            print(f"Response: {patch_response.status_code}")
                            
                            if patch_response.text:
                                updated_data = patch_response.json()
                                print(f"Updated policy data: {json.dumps(updated_data, indent=2)}")
                        else:
                            print(f"No updates needed")
                if not updated:
                    print(f"Policy group doesn't use policy_pack, {component_policy_pack_name}")
            else:
                print("No applied policy packs found")
            
        except requests.exceptions.RequestException as e:
            print(f"API request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Status code: {e.response.status_code}")
                print(f"Response text: {e.response.text}")
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON response: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"Unexpected error: {e}")
            sys.exit(1)
    
    return True

if __name__ == "__main__":
    update_policy_config()