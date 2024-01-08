#!/bin/bash

# Check if a scope is provided
if [ "$#" -ne 1 ]; then
    echo "No scope provided. Usage: $0 [scope]"
    exit 1
fi

scope=$1

# Check if on main branch
currentBranch=$(git symbolic-ref --short HEAD)
if [ "$currentBranch" != "main" ]; then
    echo "Not on main branch. Current branch is $currentBranch."
    exit 1
fi

# Check if local repo is up to date with remote
git fetch origin
localRev=$(git rev-parse HEAD)
remoteRev=$(git rev-parse origin/main)

if [ "$localRev" != "$remoteRev" ]; then
    echo "Local repo is not up to date with remote. Please pull the latest changes."
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "There are uncommitted changes. Please commit or stash them."
    exit 1
fi

# Creating new branch
branchName="release/$scope"
git checkout -b "$branchName"
echo "New branch created: $branchName"
