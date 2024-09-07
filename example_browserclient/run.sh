export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/home/phoenix000/anaconda3/envs/newest/lib/python3.11/site-packages/nvidia/cublas/lib:/home/phoenix000/anaconda3/envs/newest/lib/python3.11/site-packages/nvidia/cudnn/lib && python server.py


# Use python to check the path of the lib

# import os
# import nvidia.cublas.lib
# import nvidia.cudnn.lib

# print(os.path.dirname(nvidia.cublas.lib.__file__) + ":" + os.path.dirname(nvidia.cudnn.lib.__file__))