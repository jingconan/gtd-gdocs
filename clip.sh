if [[ "$OSTYPE" == "darwin"* ]]; then
  # Mac OSX
  node compile.js && cat build/compiled_script.js | pbcopy
fi
