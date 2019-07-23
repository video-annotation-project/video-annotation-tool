import functools
import time

def timer(task_name):
    def decorator(function):
		@functools.wraps(func)
        def wrapper(*args, **kwargs):
    		print(f'Starting {task_name}')
	        start_time = time.perf_counter()
	        value = func(*args, **kwargs)
	        end_time = time.perf_counter()
	        run_time = end_time - start_time
        	print(f"Finished {task_name} in {run_time:.4f / 60} minutes")
        	return value
        return wrapper
    return decorator
