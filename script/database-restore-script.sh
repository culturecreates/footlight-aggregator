#!/bin/bash

usage() {
  echo # (optional) move to a new line
  echo "Usage: $0
                -s <source_server_ip_address> : source database server IP address.
                -d <dump_file_location>: PEM file location including the complete path in the source server.
                -l <pem_file_path>: dump file location including the complete path.
                -a <destination_ip_address> : source database server IP address.
                -p <destination_port> : source database server port number."
  exit 1
}

while getopts s:d:l:a:p: flag; do
  case "${flag}" in
  s) SOURCE_IP=${OPTARG} ;;
  d) DUMP_FILE=${OPTARG} ;;
  l) PEM_FILE=${OPTARG} ;;
  a) DESTINATION_IP=${OPTARG} ;;
  p) DESTINATION_PORT=${OPTARG} ;;
  *) usage ;;
  esac
done

if [ -z "$SOURCE_IP" ] || [ -z "$DUMP_FILE" ] || [ -z "$PEM_FILE" ] || [ -z "$DESTINATION_IP" ]|| [ -z "$DESTINATION_IP" ]; then
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
  mongorestore --host "$DESTINATION_IP" --drop --port "$DESTINATION_PORT" ./database-backup

  echo "\nMongo dump restoration completed!"

  echo "\nRemoving copied database backup file"
  rm -r ./database-backup
else
  echo "\nDatabase restoration aborted."
fi
