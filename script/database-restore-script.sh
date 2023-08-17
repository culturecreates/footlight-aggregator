#!/bin/bash

usage() {
  echo # (optional) move to a new line
  echo "Usage: $0
                -s <source_server_ip_address> : source database server IP address.
                -d <dump_file_location>: PEM file location including the complete path in the source server.
                -l <pem_file_path>: dump file location including the complete path.
                -a <destination_ip_address> : destination database server IP address.q1
                -p <destination_port> : destination database server port number.
                -u <destination_user_name>: destination database user name.
                -c <destination_password>: destination database password"
  exit 1
}

while getopts s:d:l:a:p:u:c: flag; do
  case "${flag}" in
  s) SOURCE_IP=${OPTARG} ;;
  d) DUMP_FILE=${OPTARG} ;;
  l) PEM_FILE=${OPTARG} ;;
  a) DESTINATION_IP=${OPTARG} ;;
  p) DESTINATION_PORT=${OPTARG} ;;
  u) DATABASE_USER_NAME=${OPTARG} ;;
  c) DATABASE_PASSWORD=${OPTARG} ;;
  *) usage ;;
  esac
done

if [ -z "$SOURCE_IP" ] || [ -z "$DUMP_FILE" ] || [ -z "$PEM_FILE" ] || [ -z "$DESTINATION_IP" ]|| [ -z "$DATABASE_USER_NAME" ]|| [ -z "$DATABASE_PASSWORD" ]; then
  usage
fi

echo # (optional) move to a new line
echo "Source IP address: $SOURCE_IP"
echo "DUMP_FILE: $DUMP_FILE"
echo "Destination IP address: $DESTINATION_IP"
echo "Destination database port: $DESTINATION_PORT"
echo "PEM_FILE: $PEM_FILE"
echo # (optional) move to a new line

read -p "Confirm the above configuration. Are you sure to go ahead? Press Y to proceed" -n 1 -r
echo # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "\n**********************************************"
  echo "\nCopying dump to the local server..."
  scp -r -i "$PEM_FILE" ubuntu@"$SOURCE_IP":"$DUMP_FILE" ./database-backup

  echo "\nRestoring Database"
  mongorestore --host "$DESTINATION_IP" --port "$DESTINATION_PORT" --username "$DATABASE_USER_NAME" --password "$DATABASE_PASSWORD" --db footlight-calendar ./database-backup/footlight-calendar --drop

  echo "\nMongo dump restoration completed!"

  echo "\nRemoving copied database backup file"
  rm -r ./database-backup
else
  echo "\nDatabase restoration aborted."
fi
