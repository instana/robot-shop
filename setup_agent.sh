#!/bin/bash

###
### Copyright 2019, Instana Inc.
###
### Licensed under the Apache License, Version 2.0 (the "License");
### you may not use this file except in compliance with the License.
### You may obtain a copy of the License at
###
###     http://www.apache.org/licenses/LICENSE-2.0
###
### Unless required by applicable law or agreed to in writing, software
### distributed under the License is distributed on an "AS IS" BASIS,
### WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
### See the License for the specific language governing permissions and
### limitations under the License.
###

set -o pipefail

AGENT_DIR="/opt/instana/agent"
# AIX, Darwin, Linux, SunOS 
OS=$(uname -s)
MACHINE=""
FAMILY="unknown"
INIT="sysv"

PKG_URI=packages.instana.io

AGENT_TYPE="dynamic"
OPEN_J9="false"
PROMPT=true
START=false
LOCATION=
ENDPOINT=""
MODE="apm"
GIT_REPO=
GIT_BRANCH=
GIT_USERNAME=
GIT_PASSWORD=
INSTANA_AGENT_SYSTEMD_TYPE=simple

INSTANA_AGENT_KEY="$INSTANA_AGENT_KEY"
INSTANA_DOWNLOAD_KEY="$INSTANA_DOWNLOAD_KEY"
INSTANA_AGENT_HOST="$INSTANA_AGENT_HOST"
INSTANA_AGENT_PORT="${INSTANA_AGENT_PORT:-443}"

INSTANA_AWS_REGION_CONFIG=""

gpg_check=1

function exists {
  if which "$1" >/dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

download_command='none'

function download_to_stdout {
  case "${download_command}" in
  'curl')
    download_to_stdout_curl $@
    ;;
  'wget')
    download_to_stdout_wget $@
    ;;
  *)
    log_error "Unknown download command '${download_command}'"
    exit 1;
  esac
}

function download_to_stdout_curl {
  local url="$1"
  # Auth is passed in curl format: <user>:<password>
  local authentication="$2"
  local authentication_parameters
  # Connection timeout, default 2 secs
  local connect_timeout="${3:-2}"

  if [ -n "${authentication}" ]; then
    authentication_parameters="-u ${authentication}"
  fi

  if curl -s --fail --connect-timeout "${connect_timeout}" ${authentication_parameters} "${url}"; then
    return 0
  else
    return $?
  fi
}

function download_to_stdout_wget {
  local url="$1"
  # Auth is passed in curl format: <user>:<password>
  local authentication="$2"
  local authentication_parameters
  # Connection timeout, default 2 secs
  local connect_timeout="${3:-2}"

  if [ -n "${authentication}" ]; then
    local username;
    username=$(awk -F ':' '{ print $1}' <<< "${authentication}")

    local password
    password=$(awk -F ':' '{ print $2}' <<< "${authentication}")

    authentication_parameters="--auth-no-challenge --http-user=${username} --http-password=${password}"
  fi

  if wget --timeout="${connect_timeout}" -qO- ${authentication_parameters} "${url}"; then
    return 0
  else
    return $?
  fi
}

function log_error {
  local message=$1

  if [[ $TERM == *"color"* ]]; then
    echo -e "\e[31m$message\e[0m"
  else
    echo $message
  fi
}

function log_info {
  local message=$1

  if [[ $TERM == *"color"* ]]; then
    echo -e "\e[32m$message\e[0m"
  else
    echo $message
  fi
}

function log_warn {
  local message=$1

  if [[ $TERM == *"color"* ]]; then
    echo -e "\e[33m${message}\e[0m"
  else
    echo "${message}"
  fi
}

function receive_confirmation() {
  read -r -p "$1 [y/N] " response

  if [[ ! $response =~ ^([yY][eE][sS]|[yY])$ ]]; then
    return 1
  fi

  return 0
}

function check_prerequisites() {
  if exists curl; then
    download_command='curl'
  elif exists wget; then
    download_command='wget'
  else
    log_error 'This script requires either curl or wget to be installed on this system. Aborting installation.'
    exit 1
  fi

  if ! which gpg > /dev/null 2>&1; then
    log_warn 'The "gpg" program is not installed on this system: the verification of the Instana agent packages cannot be performed.'
    if [ $PROMPT = true ]; then
      if ! receive_confirmation 'Do you want to continue?'; then
        exit 1
      fi
    fi

    log_warn 'The verification of the Instana agent packages will be skipped.'
    gpg_check=0
  fi
}

function check_download_key() {
  # Retry the download-key check a few times with increasing timeout as this appeared to be unreliable at times
  # Timeout is identified by exit code 28 for curl, and 4 for wget.
  local retval
  local n=1
  while :
  do
	# Use an increasing timeout of "n*3" seconds
	download_to_stdout "https://${PKG_URI}/agent/generic/x86_64/repodata/repomd.xml" "_:${INSTANA_DOWNLOAD_KEY}" $((n * 3)) > /dev/null 2>&1
	retval=$?

	[ ${retval} -ne 28 ] && [ ${retval} -ne 4 ] && break || n=$((n + 1))
	[ ${n} -ge 5 ] && break

  done

  if [ ${retval} -eq 28 ] || [ ${retval} -eq 4 ]; then
	log_error "Verifying the Instana agent download key timed-out, please try again."
	exit 1
  elif [ ${retval} -ne 0 ]; then
    log_error "The Instana agent download key provided seems to be invalid, please check the agent key and try again."
    exit 1
  fi
}

function detect_family() {
  if which apt-get &> /dev/null; then
    FAMILY="apt"
    return 0
  fi

  if type dnf &>/dev/null
  then
    FAMILY="dnf"
    return 0
  fi

  if type yum &>/dev/null
  then
    FAMILY="yum"
    return 0
  fi

  if which zypper &> /dev/null; then
    FAMILY="zypper"
    return 0
  fi
}

function detect_init() {
  if ls -l /sbin/init | grep systemd &> /dev/null; then
    INIT="systemd"
    return 0
  fi

  if /sbin/init --version | grep upstart &> /dev/null; then
    INIT="upstart"
    return 0
  fi
}

function detect_machine() {
  if [ "$OS" = "AIX" ]; then
    MACHINE=$(uname -p)
  elif [ "$OS" = "Darwin" ]; then
    MACHINE=$(uname -m)
  elif [ "$OS" = "Linux" ]; then
    MACHINE=$(uname -m)
  elif [ "$OS" = "SunOS" ]; then
    MACHINE=$(uname -m)
  else
    log_info "Could not detect machine for OS: $OS"
    MACHINE="unknown"
  fi
}

function get_endpoint() {
  if [ -n "${ENDPOINT}" ]; then
    local split=(${ENDPOINT//:/ })
    INSTANA_AGENT_HOST="${split[0]}"
    INSTANA_AGENT_PORT="${split[1]}"
  elif [[ "${LOCATION}" == "eu" ]]; then
    INSTANA_AGENT_HOST="saas-eu-west-1.instana.io"
  elif [[ "${LOCATION}" == "us" ]]; then
    INSTANA_AGENT_HOST="saas-us-west-2.instana.io"
  elif [[ "${LOCATION}" == "red" ]]; then
    INSTANA_AGENT_HOST="ingress-red-saas.instana.io"
  elif [[ "${LOCATION}" == "blue" ]]; then
    INSTANA_AGENT_HOST="ingress-blue-saas.instana.io"
  elif [[ "${LOCATION}" == "green" ]]; then
    INSTANA_AGENT_HOST="ingress-green-saas.instana.io"
  fi
}

function use_internal_packages () {
  if [ "${USE_INTERNAL_PACKAGES}" = 'true' ]; then
    local MVN_CFG_FILE='/opt/instana/agent/etc/org.ops4j.pax.url.mvn.cfg'
    log_info "Configuring internal repository usage in ${MVN_CFG_FILE} file"
    sed -i 's/features-public@id=features/features-internal@id=features/' "${MVN_CFG_FILE}"
  fi
}

function setup_agent() {
  local gpg_uri="https://${PKG_URI}/Instana.gpg"

  case "$FAMILY" in

  'apt')

    log_info "Setting up Instana APT repository"

    # For whatever reason debian uses rando arch names instead of what is reported by uname
    local arch="$MACHINE"

    case "${MACHINE}" in

    'x86_64')
      arch='amd64'
      ;;

    'aarch64')
      arch='arm64'
      ;;

    'ppc64le')
      arch='ppc64el'
      ;;

    esac

    local INSTANA_AUTH_CONF_FILE='/etc/apt/auth.conf.d/instana-packages.conf'
    if [ -d "$(dirname "${INSTANA_AUTH_CONF_FILE}")" ]; then
      # We should use /etc/apt/auth.conf.d rather than hard-coding the credentials in the `apt url`.
      if ! echo "machine ${PKG_URI}
login _
password ${INSTANA_DOWNLOAD_KEY}
" > "${INSTANA_AUTH_CONF_FILE}"; then
        log_error "Cannot create the ${INSTANA_AUTH_CONF_FILE} file to configure authentication for the ${PKG_URI} repository"
        exit 1
      fi

      log_info "Authentication for the ${PKG_URI} repository has been added to apt via the ${INSTANA_AUTH_CONF_FILE} file"

      local apt_uri="deb [arch=${arch}] https://${PKG_URI}/agent/deb generic main"
    else
      local apt_uri="deb [arch=${arch}] https://_:${INSTANA_DOWNLOAD_KEY}@${PKG_URI}/agent/deb generic main"
    fi

    if ! echo "$apt_uri" > /etc/apt/sources.list.d/instana-agent.list; then
      log_error "Instana APT repository setup failed"
      exit 1
    fi

    if [ "${gpg_check}" -eq 1 ]; then
      log_info "Importing Instana GPG key"
      if ! download_to_stdout "$gpg_uri" | apt-key add - > /dev/null; then
        log_error "Instana GPG key import failed"
        exit 1
      fi
    else
      AUTHENTICATION_PARAM='--allow-unauthenticated -o Acquire::AllowInsecureRepositories=true'
    fi

    log_info "Updating apt metadata"

    if ! apt-get ${AUTHENTICATION_PARAM} update -o Dir::Etc::sourcelist="sources.list.d/instana-agent.list" -o Dir::Etc::sourceparts="-" -o APT::Get::List-Cleanup="0" > /dev/null; then
      log_error "APT repository metadata update failed"
      exit 1
    fi

    log_info "Installing Instana agent"

    if ! apt-get ${AUTHENTICATION_PARAM} install -y instana-agent-${AGENT_TYPE} > /dev/null; then
      log_error "Instana agent package install failed"
      exit 1
    fi

    use_internal_packages
    ;;

  'dnf')

    log_info "Setting up Instana RPM repository"

    local yum_repo
    read -r -d '' yum_repo <<EOF
[instana-agent]
name=Instana
baseurl=https://_:${INSTANA_DOWNLOAD_KEY}@${PKG_URI}/agent/rpm/generic/$MACHINE
enabled=1
gpgcheck=${gpg_check}
repo_gpgcheck=${gpg_check}
gpgkey=${gpg_uri}
sslverify=1
EOF

    if ! echo "$yum_repo" > /etc/yum.repos.d/Instana-Agent.repo; then
      log_error "Instana YUM repository setup failed"
      exit 1
    fi

    log_info "Updating YUM metadata"
    if ! dnf makecache -y > /dev/null 2>&1; then
      log_error "YUM repository metadata update failed"
      exit 1
    fi

    log_info "Installing Instana agent"

    if ! dnf install -y instana-agent-$AGENT_TYPE > /dev/null; then
      log_error "Instana agent package install failed"
      exit 1
    fi

    use_internal_packages
    ;;

  'yum')

    log_info "Setting up Instana YUM repository"

    local yum_repo
    read -r -d '' yum_repo <<EOF
[instana-agent]
name=Instana
baseurl=https://_:${INSTANA_DOWNLOAD_KEY}@${PKG_URI}/agent/rpm/generic/$MACHINE
enabled=1
gpgcheck=${gpg_check}
repo_gpgcheck=${gpg_check}
gpgkey=${gpg_uri}
sslverify=1
EOF

    if ! echo "$yum_repo" > /etc/yum.repos.d/Instana-Agent.repo; then
      log_error "Instana YUM repository setup failed"
      exit 1
    fi

    log_info "Updating YUM metadata"
    if ! yum makecache -y fast > /dev/null 2>&1; then
      log_error "YUM repository metadata update failed"
      exit 1
    fi

    log_info "Installing Instana agent"

    if ! yum install -y instana-agent-$AGENT_TYPE > /dev/null; then
      log_error "Instana agent package install failed"
      exit 1
    fi

    use_internal_packages
    ;;

  'zypper')

    log_info "Setting up Instana zypper repository"

    local zypp_repo
    read -r -d '' zypp_repo <<EOF
[instana-agent]
name=Instana
baseurl=https://_:${INSTANA_DOWNLOAD_KEY}@${PKG_URI}/agent/rpm/generic/$MACHINE/
enabled=1
gpgcheck=${gpg_check}
repo_gpgcheck=${gpg_check}
gpgkey=${gpg_uri}
sslverify=1
EOF

    if ! echo "$zypp_repo" > /etc/zypp/repos.d/Instana-Agent.repo; then
      log_error "Instana zypper repository setup failed"
      exit 1
    fi

    if [ "${gpg_check}" -eq 1 ]; then
      log_info "Importing Instana GPG key"
      if ! rpm --import "$gpg_uri"; then
        log_error "Instana GPG key import failed"
        exit 1
      fi
    fi

    log_info "Updating zypper metadata"
    if ! zypper -n refresh Instana > /dev/null 2>&1; then
      log_error "zypper repository metadata update failed"
      exit 1
    fi

    log_info "Installing Instana agent"

    if ! zypper -n install instana-agent-$AGENT_TYPE > /dev/null; then
      log_error "Instana agent package install failed"
      exit 1
    fi

    use_internal_packages
    ;;

    *)
      log_error 'Unsupported package manager. The supported packages managers are: apt, dnf, yum, zypper'
      exit 1;

  esac

}

function configure_mode() {
  if [ "${MODE}" = 'apm' ]; then
    /bin/cp "${AGENT_DIR}/etc/instana/com.instana.agent.main.config.Agent.cfg.template" "${AGENT_DIR}/etc/instana/com.instana.agent.main.config.Agent.cfg"
    echo "mode = APM" >> "${AGENT_DIR}/etc/instana/com.instana.agent.main.config.Agent.cfg"

    return 0
  fi

  if [ "${MODE}" = 'aws' ]; then
    log_info 'Configuring AWS mode'
    # Get region from metadata endpoint

    if [ -n "${INSTANA_AWS_REGION_CONFIG}" ]; then
      log_info "Using the AWS region ${INSTANA_AWS_REGION_CONFIG} configured via the 'INSTANA_AWS_REGION_CONFIG' environment variable"
      export INSTANA_AWS_REGION_CONFIG
    elif ! INSTANA_AWS_REGION_CONFIG=$(download_to_stdout http://169.254.169.254/latest/dynamic/instance-identity/document | awk -F\" '/region/ {print $4}'); then
      log_error "Error querying AWS metadata. It seems this virtual machine is not running on EC2. Please set the 'INSTANA_AWS_REGION_CONFIG' environment variable manually."
      exit 1
    fi

    ROLES_FOUND=false

    if download_to_stdout http://169.254.169.254/latest/meta-data/iam/security-credentials/ > /dev/null 2>&1; then
      ROLES_FOUND=true
    fi

    if [ "$ROLES_FOUND" = "false" ]; then
      if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
        log_error "AWS_ACCESS_KEY_ID and/or AWS_SECRET_ACCESS_KEY not exported, and no IAM instance role detected to allow AWS API access."
        exit 1
      fi
    fi

    /bin/cp "${AGENT_DIR}/etc/instana/com.instana.agent.main.config.Agent.cfg.template" "${AGENT_DIR}/etc/instana/com.instana.agent.main.config.Agent.cfg"
    echo "mode = INFRASTRUCTURE" >> "${AGENT_DIR}/etc/instana/com.instana.agent.main.config.Agent.cfg"

    return 0
  fi

  if [ "$MODE" = "infra" ]; then
    /bin/cp "${AGENT_DIR}/etc/instana/com.instana.agent.main.config.Agent.cfg.template" "${AGENT_DIR}/etc/instana/com.instana.agent.main.config.Agent.cfg"
    echo "mode = INFRASTRUCTURE" >> "${AGENT_DIR}/etc/instana/com.instana.agent.main.config.Agent.cfg"

    return 0
  fi
}

function delete_git_repo() {
  rm -rf "${AGENT_DIR}/etc/.git"
}

function check_preexisting_git_repository() {
  if [ -n "${GIT_REPO}" ] && [ -d "${AGENT_DIR}/etc/.git" ]; then
    log_warn "The Git options have been specified, but there is already a Git repository in '${AGENT_DIR}/etc/.git'. To continue, we need to remove the current Git repository."

    if [ $PROMPT = true ]; then
      if receive_confirmation 'Do you want to continue?'; then
        delete_git_repo
      fi
    else
      delete_git_repo
    fi
  fi
}

function configure_env() {
  local env_content=""
  local env_path=""

  if [ "$INIT" = "systemd" ]; then
    env_path=/opt/instana/agent/etc/systemd.env
  else
    if [ "$FAMILY" = "zypper" ] || [ "$FAMILY" = "yum" ]; then
      env_path=/etc/sysconfig/instana-agent
    fi

    if [ "$FAMILY" = "apt" ]; then
      env_path=/etc/default/instana-agent
    fi
  fi

  [[ -n "$INSTANA_AWS_REGION_CONFIG" ]] && env_content+="$(get_env_line INSTANA_AWS_REGION_CONFIG $INSTANA_AWS_REGION_CONFIG)\n"
  [[ -n "$AWS_ACCESS_KEY_ID" ]] && env_content+="$(get_env_line AWS_ACCESS_KEY_ID $AWS_ACCESS_KEY_ID)\n"
  [[ -n "$AWS_SECRET_ACCESS_KEY" ]] && env_content+="$(get_env_line AWS_SECRET_ACCESS_KEY "$AWS_SECRET_ACCESS_KEY")\n"
  [[ -n "$GIT_REPO" && -n "$GIT_BRANCH" ]] && env_content+="$(get_env_line INSTANA_GIT_REMOTE_REPOSITORY "$GIT_REPO")\n$(get_env_line INSTANA_GIT_REMOTE_BRANCH "$GIT_BRANCH")\n"

  if [ -n "$GIT_USERNAME" ]; then
    env_content+="$(get_env_line INSTANA_GIT_REMOTE_USERNAME "$GIT_USERNAME")\n"
    if [ -n "$GIT_PASSWORD" ]; then
      env_content+="$(get_env_line INSTANA_GIT_REMOTE_PASSWORD "$GIT_PASSWORD")\n"
    else
      env_content+="$(get_env_line INSTANA_GIT_REMOTE_PASSWORD "")\n"
    fi
  fi

  printf "$env_content" > "$env_path"
}

function get_env_line() {
  local key=$1
  local val=$2

  if [ "$INIT" = "systemd" ]; then
    echo "${key}=${val}"
  else
    echo "export ${key}=${val}"
  fi
}

function update_custom_systemd_unit_file () {
  # file does not exists -> new installation indicator
  if [ "$INIT" = "systemd" ] && [ ! -e /lib/systemd/system/instana-agent.service ]; then
    mkdir -p /etc/systemd/system/instana-agent.service.d/
    local systemd_custom_start_conf
    read -r -d '' systemd_custom_start_conf <<EOF
[Service]
Type=$INSTANA_AGENT_SYSTEMD_TYPE
EOF

    if ! echo "$systemd_custom_start_conf" > /etc/systemd/system/instana-agent.service.d/agent-custom-start.conf; then
      log_warn "Failed to create '/etc/systemd/system/instana-agent.service.d/agent-custom-start.conf'"
    fi

  fi
}


function start_agent() {
  if [ $START = false ]; then
    return 0
  fi

  if [ "$INIT" = "systemd" ]; then
    if ! systemctl enable instana-agent > /dev/null 2>&1; then
      log_error "Instana agent service enable on boot failed"
      exit 1
    else
      log_info "Instana agent enabled on boot"
    fi

    log_info "Starting instana-agent"
    if ! systemctl restart instana-agent > /dev/null 2>&1; then
      log_error "Instana agent service start failed"
      exit 1
    fi
  else
    log_warn "Instana agent automatic enable/startup by this script is only supported for systemd"
    log_warn "Utilize your distribution's init system methods to enable/start the agent"
  fi
}

while getopts "syjinl:e:t:m:a:d:i:g:b:u:p:" opt; do
  case $opt in
    a)
      INSTANA_AGENT_KEY=$OPTARG
      ;;
    b)
      GIT_BRANCH=$OPTARG
      ;;
    l)
      LOCATION=$OPTARG
      ;;
    d)
      INSTANA_DOWNLOAD_KEY=$OPTARG
      ;;
    e)
      ENDPOINT=$OPTARG
      ;;
    g)
      GIT_REPO=$OPTARG
      ;;
    m)
      MODE=$OPTARG
      ;;
    n)
      INSTANA_AGENT_SYSTEMD_TYPE=notify
      ;;
    p)
      GIT_PASSWORD=$OPTARG
      ;;
    u)
      GIT_USERNAME=$OPTARG
      ;;
    s)
      START=true
      ;;
    i)
      USE_INTERNAL_PACKAGES=true
      ;;
    j)
      OPEN_J9="true"
      ;;
    t)
      AGENT_TYPE=$OPTARG
      # full and minimal are deprecated
      # remove this when the packages are removed
      if [ "$AGENT_TYPE" = "full" ]; then
        AGENT_TYPE=dynamic
      fi

      if [ "$AGENT_TYPE" = "minimal" ]; then
        AGENT_TYPE=dynamic
      fi
      ;;
    y)
      PROMPT=false
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      exit 1
      ;;
  esac
done

if [ "$(id -u)" != "0" ]; then
  log_error "This script must be executed as a user with root privileges"
  exit 1
fi

if [ "$OS" = "Darwin" ]; then
  log_error "Agent install script does not support macOS. Please download the macOS package from the 'Installing Instana Agents' wizard."
  exit 1
fi

if [ "$OS" = "AIX" ]; then
  log_error "Agent install script does not support AIX. Please download the AIX package from the 'Installing Instana Agents' wizard."
  exit 1
fi

if [ "$OS" = "SunOS" ]; then
  log_error "Agent install script does not support Solaris. Please download the Solaris package from the 'Installing Instana Agents' wizard."
  exit 1
fi

detect_machine

if [ $MACHINE != "x86_64" ] && [ $MACHINE != "aarch64" ] && [ $MACHINE != "s390x" ] && [ $MACHINE != "ppc64le" ]; then
  log_error "Systems architecture: $MACHINE not supported"
  exit 1
fi

if [ ! "$INSTANA_AGENT_KEY" ]; then
  echo "-a INSTANA_AGENT_KEY required!"
  exit 1
fi

if [ ! "$INSTANA_DOWNLOAD_KEY" ]; then
  INSTANA_DOWNLOAD_KEY="$INSTANA_AGENT_KEY"
fi

if [ $AGENT_TYPE != "static" ] && [ $AGENT_TYPE != "dynamic" ]; then
  log_error "Invalid agent type specified $AGENT_TYPE"
  exit 1
fi

if [ "$ENDPOINT" != "" ]; then
  if ! echo "$ENDPOINT" | grep ":" &>/dev/null; then
    log_error "Agent endpoint must be in the format of <host>:<port>"
    exit 1
  fi
fi

if [ -n "${LOCATION}" ]; then
  log_warn "The -l parameter is deprecated and will not be updated to cover new SaaS regions going forward. Use -e instead."
  if [ "${LOCATION}" != "eu" ] && [ "${LOCATION}" != "us" ] && [ "${LOCATION}" != "red" ] && [ "${LOCATION}" != "blue" ] && [ "${LOCATION}" != "green" ]; then
    log_error "Invalid location '${LOCATION}' specified. Please select 'blue', 'red' or 'green'."
    exit 1
  fi
fi

if [ "$MODE" != "apm" ] && [ "$MODE" != "aws" ] && [ "$MODE" != "infra" ]; then
  log_error "Invalid mode specified. Supported modes: apm | aws | infra."
  exit 1
fi

if [ $OPEN_J9 = "true" ] || [ $MACHINE = "ppc64le" ]; then
  AGENT_TYPE="${AGENT_TYPE}-j9"
fi

if [ ! "$INSTANA_DOWNLOAD_KEY" ]; then
  INSTANA_DOWNLOAD_KEY="$INSTANA_AGENT_KEY"
fi

if [ -n "${GIT_REPO}" ]; then
  if [ -z "${GIT_BRANCH}" ]; then
    log_error "The '-g' option for the Git repository has been specified without the '-b' option to specify the remote branch."
    exit 1
  fi
else
  if [ -n "${GIT_BRANCH}" ]; then
    log_error "The '-b' option for the remote branch has been specified without the '-g' option to specify the Git repository."
    exit 1
  fi

  if [ -n "${GIT_USERNAME}" ]; then
    log_error "The '-u' option for the username to authenticate with has been specified without the '-g' option to specify the Git repository."
    exit 1
  fi

  if [ -n "${GIT_PASSWORD}" ]; then
    log_error "The '-p' option for the password to authenticate with has been specified without the '-g' option to specify the Git repository."
    exit 1
  fi
fi

if [ -n "${GIT_PASSWORD}" ]; then
  if [ -z "${GIT_USERNAME}" ]; then
    log_error "The '-p' option for the password to authenticate with has been specified without the '-u' option to specify the username."
    exit 1
  fi
fi

detect_family

detect_init

echo "Setting up the ${AGENT_TYPE} Instana agent for $OS"

if [ $PROMPT = false ]; then
  response=y
else
  if ! receive_confirmation "Are you sure?"; then
    exit 1
  fi
fi

check_prerequisites

export INSTANA_AGENT_KEY
export INSTANA_DOWNLOAD_KEY
export INSTANA_AGENT_HOST
export INSTANA_AGENT_PORT

check_download_key

get_endpoint


update_custom_systemd_unit_file

if ! setup_agent; then
  exit 1
fi

configure_mode

check_preexisting_git_repository

configure_env

if ! start_agent; then
  exit 1
fi
