#!/bin/sh

# Handle PUID/PGID for Unraid compatibility
PUID=${PUID:-99}
PGID=${PGID:-100}

# Set umask to allow full permissions (000 = no restrictions, chmod will set actual permissions)
umask 000

echo "Starting with UID: $PUID, GID: $PGID"

# Check if a group with this GID already exists
EXISTING_GROUP=$(getent group "$PGID" | cut -d: -f1)

if [ -n "$EXISTING_GROUP" ]; then
    # Use the existing group
    GROUP_NAME="$EXISTING_GROUP"
    echo "Using existing group: $GROUP_NAME (GID: $PGID)"
else
    # Create new group
    GROUP_NAME="abc"
    addgroup -g "$PGID" "$GROUP_NAME"
    echo "Created group: $GROUP_NAME (GID: $PGID)"
fi

# Check if a user with this UID already exists
EXISTING_USER=$(getent passwd "$PUID" | cut -d: -f1)

if [ -n "$EXISTING_USER" ]; then
    # Use the existing user
    USER_NAME="$EXISTING_USER"
    echo "Using existing user: $USER_NAME (UID: $PUID)"
else
    # Create new user
    USER_NAME="abc"
    adduser -D -u "$PUID" -G "$GROUP_NAME" -h /app "$USER_NAME" 2>/dev/null || true
    echo "Created user: $USER_NAME (UID: $PUID)"
fi

# Change ownership of app directory
chown -R "$PUID:$PGID" /app

# Export PUID/PGID so Node.js can use them for chown operations
export PUID
export PGID

# Execute the main command as the user
exec su-exec "$USER_NAME" "$@"
