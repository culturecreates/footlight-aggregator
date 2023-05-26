#!/bin/bash

echo "\n \nPlease enter the source server IP address"
read server_ip

echo "\n \nPlease enter the dump file including the complete path in the source server:"
read dump_file

echo "\n \nPlease enter the PEM file including the complete path:"
read pem_file

echo "\n \nCopying dump to the local server ........"
scp -r -i "$pem_file" ubuntu@"$server_ip":"$dump_file" ./database-backup

echo "\n \nPlease enter the destination server IP address: "
read destination_server_ip

echo "\n \nPlease enter the destination mongo-db server port: "
read destination_server_port

read -p "\n \nAre you sure? Press Y to proceed" -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "\nRestoring Database"
    mongorestore --host "$destination_server_ip" --drop --port "$destination_server_port" ./database-backup

    echo "\nMongo dump restoration completed!"

    echo "\nRemoving copied database backup file"
    rm -r ./database-backup
else
  echo "\n \nDatabase restoration aborted."
fi