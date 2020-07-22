import tensorflow.keras as keras

from utils.query import con, cursor


class Progress(keras.callbacks.Callback):
    """ This class serves to keep track of the current training job's progress """

    def __init__(self, job_id, steps_per_epoch, num_epochs):
        super(keras.callbacks.Callback, self).__init__()
        self.steps_per_epoch = steps_per_epoch
        self.max_epoch = num_epochs
        self.job_id = job_id
        self.curr_epoch = 0

        self.table_name = 'training_progress'
        self.connection = con
        self.cursor = cursor

    def on_train_begin(self, logs={}):
        self.cursor.execute(
            f"""UPDATE
                    {self.table_name}
                SET
                    job_id=%s,
                    status=1,
                    curr_epoch=0,
                    max_epoch=%s,
                    curr_batch=0,
                    steps_per_epoch=%s,
                    stop_flag=False
                """,
            (self.job_id, self.max_epoch, self.steps_per_epoch))

        self.connection.commit()

    def on_train_end(self, logs={}):
        # Status level 2 tells the frontend that we're done training.
        self.cursor.execute(
            f"""UPDATE {self.table_name} SET status = 2""")
        self.connection.commit()

    def on_epoch_begin(self, epoch, logs={}):
        self.cursor.execute(f"""UPDATE {self.table_name}  SET curr_epoch = %s""",
                            (epoch,))
        self.connection.commit()

    def on_epoch_end(self, epoch, logs={}):
        self.curr_epoch = epoch

    def on_batch_begin(self, batch, logs={}):
        self.curr_batch = batch

        self.cursor.execute(
            f"""UPDATE
                    {self.table_name}
                SET
                    curr_batch = %s""",
            (batch,))

        self.connection.commit()

    def on_batch_end(self, batch, logs={}):
        self.cursor.execute(
            f"""SELECT stop_flag FROM {self.table_name}""")
        flag = self.cursor.fetchone()[0]

        # If the stop flag is set someone has requested that we end the training early
        if flag:
            print("ending training early")
            self.model.stop_training = True
        return


# This simulates a small training job
if __name__ == '__main__':
    steps_per_epoch = 100
    num_epochs = 3

    progress = Progress(
        job_id=1234, steps_per_epoch=steps_per_epoch, num_epochs=num_epochs)

    progress.on_train_begin()
    for epoch in range(num_epochs):
        progress.on_epoch_begin(epoch)
        for batch in range(steps_per_epoch):
            progress.on_batch_begin(batch)
            progress.on_batch_end(batch)
        progress.on_epoch_end(epoch)
    progress.on_train_end()
