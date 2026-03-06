from sqlalchemy.orm import Session
from app.models.user import User, UserBase
from typing import Optional
from app.utilities.pagination import Pagination
from app.schemas.user import UserUpdate


class UserRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def search_users(self, query: str, page:int=1, offset:int=0) -> (list[User],Pagination):
        offset = (page - 1) * limit

        db_qry = select(User)
        if q:
            db_qry = db_qry.where(
                User.username.ilike(f"%{q}%") | User.email.ilike(f"%{q}%")
            )
        count_qry = select(func.count()).select_from(db_qry.subquery())
        count_todos = db.exec(count_qry).one()

        users = db.exec(db_qry.offset(offset).limit(limit)).all()
        pagination = Pagination(total_count=count_todos, current_page=page, limit=limit)

        return users, pagination

    def create(self, user_data: UserBase) -> Optional[User]:
        try:
            user_db = User.model_validate(user_data)
            self.db.add(user_db)
            self.db.commit()
            self.db.refresh(user_db)
            return user_db
        except Exception as e:
            logger.error(f"An error occurred while saving user: {e}")
            raise

    def update_user(self, user_id:int, user_data: UserUpdate)->User:
        user = db.get(User, user_id)
        if not user:
            raise Exception("Invalid user id given")
        if user_data.username:
            user.username = user_data.username
        if user_data.email:
            user.email = user_data.email
        
        try:
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
        except Exception as e:
            logger.error(f"An error occurred while updating user: {e}")
            raise

    def delete_user(self, user_id):
        user = db.get(User, user_id)
        if not user:
            raise Exception("User doesn't exist")
        try:
            self.db.delete(user)
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"An error occurred while deleting user: {e}")
            raise

