import keras
from psycopg2 import connect

import config
from utils.query import con, cursor


class Progress(keras.callbacks.Callback):

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
            f"""INSERT INTO {self.table_name}
                    (job_id, running, curr_epoch, max_epoch, curr_batch, steps_per_epoch)
                VALUES
                    (%s, TRUE, 0, %s, 0, %s) RETURNING id""",
            (self.job_id, self.max_epoch, self.steps_per_epoch))

        self.run_id = self.cursor.fetchone()[0]
        self.connection.commit()

    def on_train_end(self, logs={}):
        self.cursor.execute(
            f"""UPDATE {self.table_name} SET running = FALSE WHERE id = %s""", (self.run_id,))
        self.connection.commit()

    def on_epoch_begin(self, epoch, logs={}):
        self.cursor.execute(f"""UPDATE {self.table_name}  SET curr_epoch = %s WHERE id = %s""",
                            (epoch, self.run_id))
        self.connection.commit()

    def on_epoch_end(self, epoch, logs={}):
        self.curr_epoch = epoch
        self.cursor.execute(
            f"""SELECT stop_flag from {self.table_name} WHERE id = %s""", (self.run_id,))
        flag = self.cursor.fetchone()[0]
        if flag:
            print("end training")
            self.model.stop_training = True

    def on_batch_begin(self, batch, logs={}):
        self.curr_batch = batch

        self.cursor.execute(
            f"""UPDATE
                    {self.table_name}
                SET
                    curr_batch = %s
                WHERE id = %s""",
            (batch, self.run_id))

        self.connection.commit()

    def on_batch_end(self, batch, logs={}):
        return


# Testing
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
