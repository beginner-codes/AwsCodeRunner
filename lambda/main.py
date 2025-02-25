import sys
from io import StringIO
import os
import traceback

def run(code, stdin):
    redirected_output = StringIO()
    redirected_stdin = StringIO(stdin)
    sys.stdout = redirected_output
    sys.stdin = redirected_stdin
    exception_data = {}
    stack_depth = len(traceback.extract_stack())
    try:
        exec(
            compile(code, "<discord>", "exec"),
            {"__name__": "__main__"},
        )
    except Exception as excp:
        exception_data = {
            "type": type(excp).__qualname__,
            "args": excp.args,
            "stack": [
                {
                    "filename": frame.filename,
                    "line": frame.line,
                    "lineno": frame.lineno,
                } for frame in traceback.extract_tb(excp.__traceback__)[stack_depth - 1:]
            ]
        }
    finally:
        sys.stdout = sys.__stdout__
        sys.stdin = sys.__stdin__


    return {
        "result": redirected_output.getvalue().strip(),
        "exception": exception_data,
    }
    
def lambda_handler(event, context):
    if not "code" in event:
        return {
            'error': 'no code provided in body'
        }
        
    popped_envs = [
        "AWS_EXECUTION_ENV",
        "AWS_ACCESS_KEY",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_SESSION_TOKEN",
        "_AWS_XRAY_DAEMON_ADDRESS",
        "AWS_XRAY_DAEMON_ADDRESS",
        "AWS_LAMBDA_RUNTIME_API",
        "_AWS_XRAY_DAEMON_PORT"
    ]
    
    for env_variable_name in popped_envs:
        os.environ.pop(env_variable_name, None)
        
    code = event["code"]
    stdin = event["stdin"] if "stdin" in event else ""
    return run(code, stdin)
