#!/bin/bash
while true
do
    cat error.txt | tail -10
    cat result.txt | tail -10
    sleep 60
done
