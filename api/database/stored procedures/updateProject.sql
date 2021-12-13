SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[updateProject] 
(@projectId INTEGER, @newProjectName VARCHAR(50) = NULL, @newProjectDescription VARCHAR(225) = NULL, @updated BIT OUTPUT)
AS
BEGIN
    SET @updated = 0;
    IF @newProjectDescription IS NOT NULL
        BEGIN
            UPDATE [project] SET [description] = @newProjectDescription WHERE [id] = @projectId;
            SET @updated = @@ROWCOUNT;
        END;
    IF @newProjectName IS NOT NULL
        BEGIN
            UPDATE [project] SET [name] = @newProjectName WHERE [id] = @projectId;
            SET @updated = @@ROWCOUNT;
        END;
END;
GO
