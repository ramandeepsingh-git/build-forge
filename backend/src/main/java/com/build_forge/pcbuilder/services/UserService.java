package com.build_forge.pcbuilder.services;

import com.build_forge.pcbuilder.dto.FavoriteComponentDto;
import com.build_forge.pcbuilder.entity.FavoriteComponent;
import com.build_forge.pcbuilder.entity.User;
import com.build_forge.pcbuilder.exception.UserNotFoundException;
import com.build_forge.pcbuilder.repository.FavoriteComponentRepository;
import com.build_forge.pcbuilder.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UserService {
    @Autowired
    UserRepository userRepository;

    @Autowired
    FavoriteComponentRepository favoriteComponentRepository;

    public List<User> getUsers(){
        return userRepository.findAll();
    }

    public User saveUser(User user) {
        return userRepository.save(user);
    }

    public Optional<User> getUserById(Long id){
        return userRepository.findById(id);
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));
    }

    public void deleteUser(Long id){
        userRepository.deleteById(id);
    }

    public User updateUser(User user) {
        return userRepository.save(user);
    }

    @Transactional
    public FavoriteComponentDto addFavoriteComponent(String username, String category, String componentId) {
        User user = getUserByUsername(username);
        Optional<FavoriteComponent> existing = favoriteComponentRepository.findByUserAndCategoryAndComponentId(user, category, componentId);
        if (existing.isPresent()) {
            return new FavoriteComponentDto(existing.get().getCategory(), existing.get().getComponentId());
        }
        FavoriteComponent fav = new FavoriteComponent(user, category, componentId);
        favoriteComponentRepository.save(fav);
        return new FavoriteComponentDto(category, componentId);
    }

    @Transactional
    public void removeFavoriteComponent(String username, String category, String componentId) {
        User user = getUserByUsername(username);
        favoriteComponentRepository.deleteByUserAndCategoryAndComponentId(user, category, componentId);
    }

    @Transactional(readOnly = true)
    public List<FavoriteComponentDto> getFavoriteComponents(String username) {
        User user = getUserByUsername(username);
        return favoriteComponentRepository.findByUser(user).stream()
                .map(fav -> new FavoriteComponentDto(fav.getCategory(), fav.getComponentId()))
                .collect(Collectors.toList());
    }
}
